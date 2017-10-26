/* eslint-env mocha */
import { Schema } from '@orbit/data'
import { StateTree } from '../lib'
import { expect } from 'chai'
import Store from '@orbit/store'

describe('StateTree', () => {
  let store, schema, stateTree

  beforeEach(() => {
    schema = new Schema({
      models: {
        planet: {
          attributes: {
            name: {type: 'string'},
            classification: {type: 'string'}
          },
          relationships: {
            moons: {type: 'hasMany', model: 'moon', inverse: 'planet'}
          }
        },
        moon: {
          attributes: {
            name: {type: 'string'}
          },
          relationships: {
            planet: {type: 'hasOne', model: 'planet', inverse: 'moons'}
          }
        }
      }
    })
    store = new Store({schema})
    stateTree = new StateTree({store, schema})
  })

  it('cannot be initialized without a store and schema', () => {
    expect(() => new StateTree({})).to.throw('Store instance required')
    expect(() => new StateTree({store, schema})).to.not.throw()
  })

  it('handle addRecord', done => {
    const {requestId} = stateTree.addRecord('planet', {id: '1', name: 'jupiter'})
    expect(requestId).to.be.not.null
    stateTree.onChange(state => {
      expect(state.entities.planet['1'].attributes.name).to.be.equal('jupiter')
      expect(state.requests[requestId].result.planet).to.be.deep.equal(['1'])
      done()
    })
  })

  it('handle replaceRecord', done => {
    stateTree.addRecord('planet', {id: '1', name: 'jupiter'})
    const {requestId} = stateTree.replaceRecord('planet', {id: '1', name: 'mars'})
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.entities.planet['1'].attributes.name).to.be.equal('mars')
      expect(state.requests[requestId].result.planet).to.be.deep.equal(['1'])
      done()
    })
  })

  it('handle removeRecord', done => {
    stateTree.addRecord('planet', {id: '1', name: 'jupiter'})
    stateTree.removeRecord('planet', '1')
    const {requestId} = stateTree.findRecord('planet', '1')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result).to.be.deep.equal({})
      expect(state.requests[requestId].error.description).to.be.equal('Record not found')
      done()
    })
  })

  it('handle replaceKey', done => {
    stateTree.addRecord('planet', {id: '1', name: 'jupiter'})
    const {requestId} = stateTree.replaceKey('planet', '1', 'remoteId', 'abc123')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].error).to.be.null
      done()
    })
  })

  it('handle addToRelatedRecords', done => {
    stateTree.addRecord('planet', {id: 'earth', name: 'Earth'})
    stateTree.addRecord('moon', {id: 'luna', name: 'Luna'})
    stateTree.addToRelatedRecords('planet', '1', 'moons', 'luna')
    const {requestId} = stateTree.findRelatedRecords('planet', '1', 'moons')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.moon).to.be.deep.equal(['luna'])
      expect(state.requests[requestId].error).to.be.null
      done()
    })
  })

  it('handle removeFromRelatedRecords', done => {
    stateTree.addRecord('moon', {id: 'deimos', name: 'Deimos'})
    stateTree.addRecord('moon', {id: 'phobos', name: 'Phobos'})
    stateTree.addRecord('planet', {id: 'mars', name: 'Mars', moons: [{id: 'deimos'}, {id: 'phobos'}]})
    stateTree.removeFromRelatedRecords('planet', 'mars', 'moons', 'deimos')
    const {requestId} = stateTree.findRelatedRecords('planet', 'mars', 'moons')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.moon).to.be.deep.equal(['phobos'])
      expect(state.requests[requestId].error).to.be.null
      done()
    })
  })

  it('handle replaceRelatedRecords', done => {
    stateTree.addRecord('moon', {id: 'deimos', name: 'Deimos'})
    stateTree.addRecord('moon', {id: 'phobos', name: 'Phobos'})
    stateTree.addRecord('planet', {id: 'mars', name: 'Mars'})
    stateTree.replaceRelatedRecords('planet', 'mars', 'moons', ['deimos', 'phobos'])
    const {requestId} = stateTree.findRelatedRecords('planet', 'mars', 'moons')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.moon).to.be.deep.equal(['deimos', 'phobos'])
      expect(state.requests[requestId].error).to.be.null
      done()
    })
  })

  it('handle replaceRelatedRecords', done => {
    stateTree.addRecord('moon', {id: 'deimos', name: 'Deimos'})
    stateTree.addRecord('planet', {id: 'mars', name: 'Mars'})
    stateTree.replaceRelatedRecord('moon', 'deimos', 'planet', 'mars')
    const {requestId} = stateTree.findRelatedRecords('planet', 'mars', 'moons')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.moon).to.be.deep.equal(['deimos'])
      expect(state.requests[requestId].error).to.be.null
      done()
    })
  })

  it('handle findRecord', done => {
    stateTree.addRecord('planet', {id: '1', name: 'mercury', classification: 'terrestrial'})
    stateTree.addRecord('planet', {id: '3', name: 'earth', classification: 'terrestrial'})
    const {requestId} = stateTree.findRecord('planet', '3')
    stateTree.onChange(state => {
      const request = state.requests[requestId]
      if (!request || !request.completed) {
        return
      }
      expect(request.result.planet).to.be.deep.equal(['3'])
      done()
    })
  })

  it('handle findRecords', done => {
    stateTree.addRecord('planet', {id: '1', name: 'mercury', classification: 'terrestrial'})
    stateTree.addRecord('planet', {id: '2', name: 'venus', classification: 'terrestrial'})
    stateTree.addRecord('planet', {id: '3', name: 'earth', classification: 'terrestrial'})
    const {requestId} = stateTree.findRecords(
      'planet',
      {
        filter: [
          {attribute: 'classification', value: 'terrestrial'}
        ],
        sort: [
          {attribute: 'name', order: 'ascending'}
        ],
        page: {
          offset: 0, limit: 2
        }
      }
    )
    stateTree.onChange(state => {
      const request = state.requests[requestId]
      if (!request || !request.completed) {
        return
      }
      expect(state.entities.planet['1'].attributes.name).to.be.equal('mercury')
      expect(request.result.planet).to.be.deep.equal(['3', '1'])
      done()
    })
  })

  it('handle findRelatedRecord', done => {
    stateTree.addRecord('planet', {id: 'earth', name: 'earth', classification: 'terrestrial'})
    stateTree.addRecord('moon', {id: 'luna', name: 'luna', planet: {id: 'earth'}})
    const {requestId} = stateTree.findRelatedRecord('moon', 'luna', 'planet')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.planet).to.be.deep.equal(['earth'])
      done()
    })
  })

  it('handle findRelatedRecord empty result', done => {
    stateTree.addRecord('moon', {id: 'luna', name: 'luna'})
    const {requestId} = stateTree.findRelatedRecord('moon', 'luna', 'planet')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result).to.be.deep.equal({})
      done()
    })
  })

  it('handle findRelatedRecord invalid relationship', () => {
    stateTree.addRecord('planet', {id: 'mars', name: 'Mars', classification: 'terrestrial'})
    stateTree.addRecord('moon', {id: 'deimos', name: 'Deimos', planet: {id: 'mars'}})
    expect(
      () => stateTree.findRelatedRecord('planet', 'mars', 'moons')
    ).to.throw('Invalid relationship moons on model planet with type hasOne')
  })

  it('handle findRelatedRecords', done => {
    stateTree.addRecord('planet', {id: 'mars', name: 'Mars', classification: 'terrestrial'})
    stateTree.addRecord('moon', {id: 'deimos', name: 'Deimos', planet: {id: 'mars'}})
    stateTree.addRecord('moon', {id: 'phobos', name: 'Phobos', planet: {id: 'mars'}})
    const {requestId} = stateTree.findRelatedRecords('planet', 'mars', 'moons')
    stateTree.onChange(state => {
      if (!state.requests[requestId].completed) {
        return
      }
      expect(state.requests[requestId].result.moon).to.be.deep.equal(['deimos', 'phobos'])
      done()
    })
  })
})
