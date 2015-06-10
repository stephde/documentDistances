var docDist = require('../documentDistances.js'),
    chai = require('chai')

global.expect = chai.expect

describe('documentDistances', function(){

    it('should run the tests', function(){
        expect(true).to.equal(true)
    })

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
})