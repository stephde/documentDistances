var docDist = require('../documentDistances.js'),
    chai = require('chai')

var field = 'text',
    docList = [
        {
            vector: {
                'hallo': 3.5,
                'ich': 2.5,
                'bin': 3.8,
                'ein': 1.2,
                'test': 2.5
            },
            id: "1",
            classification: 'class1'
        },
        {
            vector: {
                'hallo': 1.5,
                'ich': 3.5,
                'bin': 2.8,
                'ein': 4.2,
                'test': 3.5
            },
            id: "2",
            classification: 'class1'
        },
        {
            vector: {
                'hallo': 0.9,
                'ich': 2.9,
                'bin': 1.8,
                'ein': 2.2,
                'test': 4.5
            },
            id: "3",
            classification: 'class2'
        }
    ],
    classifications = ['class1', 'class2']


/*** ToDo: add tests for getTfIdfVector(s) ***/

global.expect = chai.expect

describe('documentDistances', function(){

    it('should return a number when calculating tfid', function(){
        var termFreq = 1,
            docFreq = 1,
            docCount = 2

        expect(docDist.calcTfIdf(termFreq, docFreq, docCount)).to.be.a('Number')
    })

    it('should return an english stopword array', function(){
        var stopWordsEn = docDist.getStopWordsEn()

        expect(stopWordsEn.length).to.be.greaterThan(0)
        expect(stopWordsEn[0]).to.be.a('String')
    })

    it('should return a german stopword array', function(){
        var stopWordsEn = docDist.getStopWordsDe()

        expect(stopWordsEn.length).to.be.greaterThan(0)
        expect(stopWordsEn[0]).to.be.a('String')
    })

    it('should return a valid tfidf', function(){
        var tfidf = docDist.calcTfIdf(2, 3, 5)

        expect(tfidf).to.be.a('number')
    })

    it('should calculate the euclidean distance', function(){
        var distance = docDist.euclideanDistance(docList[0].vector, docList[1].vector)

        expect(distance).to.be.a('Number')
    })

    it('should calculate the cosine distance', function(){
        var distance = docDist.cosineDistance(docList[0].vector, docList[1].vector)

        expect(distance).to.be.a('Number')
    })

    it('should calculate the distance matrix', function(){
        var matrix = docDist.calcDistanceMatrix(docList)

        expect(matrix.length).to.be.greaterThan(0)
        expect(matrix[0].source).to.exist
        expect(matrix[0].target).to.exist
        expect(matrix[0].value).to.be.a('Number')
    })

    it('should calculate the dunn index', function(){
        var matrix = docDist.calcDistanceMatrix(docList),
            dunnIndex = docDist.calcDunnIndex(docList, matrix)

        expect(dunnIndex.dunnIndex).to.be.a('Number')
        expect(dunnIndex.clusterValues).to.be.an('Array')
        expect(dunnIndex.interClusterMins).to.be.an('Array')
        expect(dunnIndex.intraClusterMaxs).to.be.an('Array')
    })

    it('should predict classifications', function(){
        var predictions = docDist.predictClassificationForDoc(
            docList[0], docList.slice(1), classifications)

        expect(predictions).to.be.an('Object')
        expect(predictions[classifications[0]].value).to.be.a('Number')
    })
})