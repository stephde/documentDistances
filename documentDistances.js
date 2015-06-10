var _und = require('underscore'),

    stopWordsEn = require('./assets/stop-words_english_2_en.js'),
    stopWordsDe = require('./assets/stop-words_german_1_de.js')


var self = module.exports = {

    getStopWordsEn: function(){
        return stopWordsEn.wordsArray
    },

    getStopWordsDe: function(){
        return stopWordsDe.wordsArray
    },

    /*
     * Calculate the tf-idf of a term
     */
    calcTfIdf: function(termFreq, docFreq, docCount) {
        var InverseDocFreq = Math.log(docCount / (1 + docFreq))

        return termFreq * InverseDocFreq
    },



    /*
     * Calculate a tf-idf-vector for a given field
     */
    getTfIdfVector: function(termvectorField) {
        var docCount = termvectorField.field_statistics.doc_count,
            terms = termvectorField.terms,
            tfIdf = {}

        _und.each(terms, function(value, term) {
            //don't use numbers and non-word terms
            if( term.match(/\w+/g) && !term.match(/[0-9]+/g) &&
                !(stopWordsDe.wordsDictionary[term] || stopWordsEn.wordsDictionary[term]))
                tfIdf[term] = self.calcTfIdf(value.term_freq, value.doc_freq, docCount)
        })

        return tfIdf
    },

    /*
     * Get the tfidf vectors for multiple docs
     */
    getTfIdfVectors: function(docs, field){
        var tfIdfVectors = []

        _und.each(docs, function(doc) {
            if(doc.term_vectors && doc.term_vectors[field]){
                var fieldVal = doc.term_vectors[field]
                var result = {
                    id: doc._id,
                    vector: self.getTfIdfVector(fieldVal)
                }
                tfIdfVectors.push(result)
            }
        })

        return tfIdfVectors
    },

    /*
     * Calculate the euclidean distance between two tf-idf vectors
     */
    euclideanDistance: function(vectA, vectB) {
        // Normalise A, add missing keys of B with value 0
        var zeroedB = _und.mapObject(vectB, function(value) { return 0 })
        vectA = _und.extend(zeroedB, vectA)

        // Sum and square all corresponding values of A and B
        var sum = 0
        _und.each(vectA, function(value, key) {
            if (vectB.hasOwnProperty(key))
                sum += Math.pow(vectA[key] - vectB[key], 2)
            else
                sum += Math.pow(vectA[key], 2)
        })

        return Math.sqrt(sum)
    },


    /*
     * Calculate the distance between two doc vectors
     */
    cosineDistance: function(vectA, vectB) {
        // Normalise A, add missing keys of B with value 0
        var zeroedB = _und.mapObject(vectB, function(value) { return 0 })
        vectA = _und.extend(zeroedB, vectA)

        // Sum and square all corresponding values of A and B
        var sum = 0,
            vecLength = 0
        _und.each(vectA, function(value, key) {
            if (vectB.hasOwnProperty(key))
                sum += vectA[key] * vectB[key]
            //else
            //  sum += Math.pow(vectA[key], 2)

            vecLength++
        })

        return sum / Math.sqrt(vecLength != 0 ? vecLength : 1)
    },


    /***
     * calculates the distance matrix between all documents in the vectorList
     * only considers the top 10 links for each document
     * @param vectorList - array of documents containing the termVectors
     * @returns {Array} of links between the given documents
     */
    calcDistanceMatrix: function(vectorList) {
        var results = [],
            max = 0,
            topK = 10

        for (var i = 0; i < vectorList.length; i++) {
            var distancesForDoc = []

            //calculate distances to other docs
            for (var j = 0; j < vectorList.length; j++) {

                if(i == j)
                    continue;

                var distance = self.cosineDistance(vectorList[i].vector, vectorList[j].vector)

                distancesForDoc.push({
                    source: vectorList[i].id,
                    target: vectorList[j].id,
                    value: distance
                })

                //calculate the max distance for later normalization
                max = Math.max(distance, max)
            }

            //pick highest distances and push them into result
            distancesForDoc.sort(function(elem1, elem2){
                return elem2.value - elem1.value
            })


            results = results.concat(distancesForDoc.slice(0, topK))
        }

        //normalize array
        results.forEach(function(elem){
            elem.value = elem.value / max
        })

        return results
    },

    /***
     *
     * @param docVector - termVector of the doc to be predicted
     * @param similarDocs - array of documents containing termVectors
     * @param classifications - array of classifications as string, classification[0] is for similarDocs[0], etc...
     * @returns an object which contains a score for each classification in classifications
     */
    predictClassificationForDoc: function(docVector, similarDocs, classifications){
        var distances = [],
            max = 0,
            predictions = {}

        for(var i=0; i < similarDocs.length; i++){

            //calcDistanceTo doc
            var distance = self.cosineDistance(docVector, similarDocs[i].vector)

            distances.push(distance)

            //calculate the max distance for later normalization
            max = Math.max(distance, max)
        }

        distances.forEach(function(elem){
            elem = elem / max
        })

        //initialize predictions for each classification
        classifications.forEach(function(elem){
            predictions[elem] = {
                name: elem,
                value: 0
            }
        })

        //sum up distances to create predictions
        distances.forEach(function(distance, index){
            predictions[classifications[index]].value += distance
        })

        return predictions
    },


    /***
     * calculates the dunn index for the given distance matrix
     * @param docs - array of documents containing a classification and id
     * @param matrix - matrix of links as calculated by calcDistanceMatrix
     * @returns {{clusterValues: Array, intraClusterMaxs: Array, interClusterMins: Array, dunnIndex: number}}
     */
    calcDunnIndex: function(docs, matrix){
        var products = [],
            idDocMapping = {},
            results = [],
            intraClusterMaxs = [],
            interClusterMins = [],
            digitsAfterPoint = 8

        //get distinct clusters and create idMapping for faster lookup
        docs.forEach(function(doc){
            if(products.indexOf(doc.classification) < 0)
                products.push(doc.classification)

            idDocMapping[doc.id] = doc
        })

        /*** ToDo: increase performance by only iterating over all links once ***/
        //for each pair of clusters
        for(var i=0; i<products.length; i++){
            for(var k=0; k<products.length; k++){

                if(k <= i && (i < products.length - 1 || k < products.length -1))
                    continue;

                var interClusterMin = {
                        value: Number.MAX_VALUE,
                        source: null,
                        target: null
                    },
                    interClusterMax = {
                        value: 0,
                        source: null,
                        target: null
                    },
                    intraClusterMax = {
                        value: 0,
                        source: null,
                        target: null
                    }

                //find min and max distance between the 2 clusters
                matrix.forEach(function(link, index){
                    var sourceProduct = idDocMapping[link.source].classification,
                        targetProduct = idDocMapping[link.target].classification

                    if(sourceProduct == products[i] && targetProduct == products[k] ||
                        targetProduct == products[i] && sourceProduct == products[k]){

                        if(link.value < interClusterMin.value){
                            interClusterMin = {
                                value: link.value.toFixed(digitsAfterPoint),
                                source: link.source,
                                target: link.target
                            }
                        }

                        if(link.value > interClusterMax.value){
                            interClusterMax = {
                                value: link.value.toFixed(digitsAfterPoint),
                                source: link.source,
                                target: link.target
                            }
                        }
                    }

                    if(intraClusterMaxs.length <= i){
                        if(sourceProduct == products[i] && products[i] == targetProduct){
                            if(link.value > intraClusterMax.value/* && link.value != 1*/)
                                intraClusterMax = {
                                    value: link.value.toFixed(digitsAfterPoint),
                                    source: link.source,
                                    target: link.target
                                }
                        }
                    }
                })

                if(intraClusterMax.value > 0){
                    intraClusterMax.cluster = products[i]
                    intraClusterMaxs.push(intraClusterMax)
                }

                interClusterMins.push(interClusterMin.value)

                results.push({
                    clusters: [products[i], products[k]],
                    minDistance: interClusterMin,
                    maxDistance: interClusterMax,
                    index: interClusterMin.value / interClusterMax.value
                })
            }
        }

        //get min of max distances (inter-distances)
        var min =  Math.min.apply(null, interClusterMins)
        //get max of max distances in the clusters (intra-distances)
        var max = Math.max.apply(null, intraClusterMaxs.map(function(max){return max.value}))

        return {
            clusterValues: results,
            intraClusterMaxs: intraClusterMaxs,
            interClusterMins: interClusterMins,
            dunnIndex: min / max
        }
    }
}