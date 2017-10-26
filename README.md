# Orbit State Tree

Library based on OrbitJS that manages a single state tree to be used on stores like Redux

## Installation

```sh
$ npm install --save orbit-state-tree @orbit/data @orbit/store
```

## Basic usage

```js
const {StateTree, recordSelector, requestSelector} = require('orbit-state-tree')
const {Schema} = require('@orbit/data')
const Store = require('@orbit/store').default

const schema = new Schema({
  models: {
    planet: {
      attributes: {
        name: { type: 'string' },
        classification: { type: 'string' }
      },
      relationships: {
        moons: { type: 'hasMany', model: 'moon', inverse: 'planet' }
      }
    },
    moon: {
      attributes: {
        name: { type: 'string' }
      },
      relationships: {
        planet: { type: 'hasOne', model: 'planet', inverse: 'moons' }
      }
    }
  }
})

const store = new Store({schema})
const stateTree = new StateTree({schema, store})

let myAppState = {}
let result = stateTree.addRecord('planet', {id: '1', name: 'Mars', classification: 'terrestrial'})
stateTree.addRecord('moon', {id: '1', name: 'Phobos', planet: {id: 1}})
stateTree.addRecord('moon', {id: '2', name: 'Deimos', planet: {id: 1}})

stateTree.onChange(data => {
  myAppState = Object.assign({}, myAppState, {api: data})
  console.log('record', recordSelector(myAppState.api, 'planet', '1')) // Return an resource if its already loaded
  console.log('request', requestSelector(myAppState.api, result.requestId))
})
```

## Tree structure example

```js
    {
        entities: {
            planets: {
                '123': {
                    attributes: {
                        id: '123',
                        name: 'Mars'
                    },
                    relationships: {
                        moons: [
                          {type: 'moons', id: '124'},
                          {type: 'moons', id: '125'}
                        ]
                    }
                }
            },
            moons: {
                '124': {
                    attributes: {
                        id: '124',
                        name: 'Deimos'
                    }
                },
                '125': {
                    attributes: {
                        id: '125',
                        name: 'Phobos'
                    }
                }
            }
        },
        requests: {
            1: {
                id: 1,
                completed: false,
                results: {
                    planets: ['123']
                },
                error: {}
            }
        }
    }
```

## Example projects

* [Cycle.js Notes](https://github.com/jefersondaniel/cyclejs-notes)
