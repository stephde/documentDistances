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
})