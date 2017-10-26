import EventEmitter from 'events'
import invariant from 'invariant'
import normalize from 'json-api-normalizer'
import Serializer from './Serializer'
import { Exception as OrbitException } from '@orbit/core'

export default class StateTree {
  /**
   * Initialize the state tree with your store and schema instances
   *
   * @param {Object} {store, schema}
   * @memberof StateTree
   */
  constructor ({store, schema}) {
    invariant(store, 'Store instance required')
    invariant(schema, 'Schema instance required')
    this._store = store
    this._schema = schema
    this._serializer = new Serializer(this._schema)
    this._events = new EventEmitter()
    this._lastRequestId = 0
    this._state = {
      entities: {},
      requests: {}
    }
  }

  /**
   * Listen for tree changes, receving a new tree every time a change is comitted
   *
   * @param {Function} callback
   */
  onChange (callback) {
    return this._events.addListener('change', callback)
  }

  /**
   * Listen for unhandled errors, errors coming from orbitjs are described on request object
   *
   * @param {Function} callback
   */
  onUnhandledError (callback) {
    return this._events.addListener('unhandledError', callback)
  }

  /**
   * Adds an record
   *
   * @param {String} type
   * @param {Object} object
   */
  addRecord (type, object) {
    return this._storeUpdate('addRecord', [this._serialize(type, object)])
  }

  /**
   * Replaces an entire record
   *
   * @param {String} type
   * @param {Object} object
   */
  replaceRecord (type, object) {
    return this._storeUpdate('replaceRecord', [this._serialize(type, object)])
  }

  /**
   * Removes an record
   *
   * @param {String} type
   * @param {String} id
   */
  removeRecord (type, id) {
    return this._storeUpdate('removeRecord', [{type, id}])
  }

  /**
   * Replaces a key
   *
   * @param {String} type
   * @param {String} id
   * @param {String} keyName
   * @param {String} keyValue
   */
  replaceKey (type, id, keyName, keyValue) {
    return this._storeUpdate('replaceKey', [{type, id}, keyName, keyValue])
  }

  /**
   * Replaces an attribute
   *
   * @param {String} type
   * @param {String} id
   * @param {String} attributeName
   * @param {String} attributeValue
   */
  replaceAttribute (type, id, attributeName, attributeValue) {
    return this._storeUpdate('replaceAttribute', [{type, id}, attributeName, attributeValue])
  }

  /**
   * Adds a member to a to-many relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationshipName
   * @param {String} relationshipId
   */
  addToRelatedRecords (type, id, relationshipName, relationshipId) {
    this._validateRelationship(type, relationshipName, 'hasMany')
    const relationshipType = this._schema.models[type].relationships[relationshipName].model
    return this._storeUpdate('addToRelatedRecords', [{type, id}, relationshipName, {type: relationshipType, id: relationshipId}])
  }

  /**
   * Removes a member from a to-many relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationshipName
   * @param {String} relationshipId
   */
  removeFromRelatedRecords (type, id, relationshipName, relationshipId) {
    this._validateRelationship(type, relationshipName, 'hasMany')
    const relationshipType = this._schema.models[type].relationships[relationshipName].model
    return this._storeUpdate('removeFromRelatedRecords', [{type, id}, relationshipName, {type: relationshipType, id: relationshipId}])
  }

  /**
   * Replaces every member of a to-many relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationshipName
   * @param {String[]} relationshipIds
   */
  replaceRelatedRecords (type, id, relationshipName, relationshipIds) {
    this._validateRelationship(type, relationshipName, 'hasMany')
    const relationshipType = this._schema.models[type].relationships[relationshipName].model
    const data = relationshipIds.map(id => ({type: relationshipType, id}))
    return this._storeUpdate('replaceRelatedRecords', [{type, id}, relationshipName, data])
  }

  /**
   * Replaces a to-one relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationshipName
   * @param {String} relationshipId
   */
  replaceRelatedRecord (type, id, relationshipName, relationshipId) {
    this._validateRelationship(type, relationshipName, 'hasOne')
    const relationshipType = this._schema.models[type].relationships[relationshipName].model
    return this._storeUpdate('replaceRelatedRecord', [{type, id}, relationshipName, {type: relationshipType, id: relationshipId}])
  }

  /**
   * Find a record by its identity.
   *
   * @param {String} type
   * @param {String} id
   */
  findRecord (type, id) {
    return this._storeQuery('findRecord', [{type, id}])
  }

  /**
   * Find all records of a specific type.
   *
   * @param {String} type
   * @param {Object} query
   */
  findRecords (type, query) {
    const hook = (builder) => {
      if (query.filter) {
        for (let filter of query.filter) {
          builder.filter(filter)
        }
      }
      if (query.sort) {
        for (let sort of query.sort) {
          builder.sort(sort)
        }
      }
      if (query.page) {
        builder.page(query.page)
      }
      return builder
    }
    return this._storeQuery('findRecords', [type], hook)
  }

  /**
   * Find a related record in a to-one relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationship
   */
  findRelatedRecord (type, id, relationship) {
    this._validateRelationship(type, relationship, 'hasOne')
    return this._storeQuery('findRelatedRecord', [{type, id}, relationship])
  }

  /**
   * Find a related record in a to-one relationship
   *
   * @param {String} type
   * @param {String} id
   * @param {String} relationship
   */
  findRelatedRecords (type, id, relationship) {
    this._validateRelationship(type, relationship, 'hasMany')
    return this._storeQuery('findRelatedRecords', [{type, id}, relationship])
  }

  _validateRelationship (type, name, relationshipType) {
    const isValid = this._schema.models[type] &&
      this._schema.models[type].relationships[name] &&
      (!relationshipType || this._schema.models[type].relationships[name].type === relationshipType)
    if (!isValid) {
      throw new Error('Invalid relationship ' + name + ' on model ' + type + ' with type ' + relationshipType)
    }
  }

  _serialize (type, object) {
    return this._serializer.serialize(type, object).data
  }

  _storeUpdate (method, args) {
    const requestId = this._createRequest()
    const promise = this._store.update(t => t[method].apply(t, args)).then(
      jsonApiObject => this._handeRequestSuccess(requestId, jsonApiObject)
    ).catch(
      error => this._handleRequestError(requestId, error)
    )
    return {requestId, promise}
  }

  _storeQuery (method, args, hook) {
    const requestId = this._createRequest()
    const promise = this._store.query(queryBuilder => {
      let query = queryBuilder[method].apply(queryBuilder, args)
      if (hook) {
        query = hook(query)
      }
      return query
    }).then(
      jsonApiObject => this._handeRequestSuccess(requestId, jsonApiObject)
    ).catch(
      error => this._handleRequestError(requestId, error)
    )
    return {requestId, promise}
  }

  _createRequest () {
    const requestId = ++this._lastRequestId
    this._mergeState({
      requests: {
        [requestId]: {
          id: requestId,
          completed: false,
          timestamp: (new Date()).getTime()
        }
      }
    })
    return requestId
  }

  _handeRequestSuccess (requestId, response) {
    const idsByType = {}
    if (Array.isArray(response)) {
      for (let item of response) {
        if (!idsByType[item.type]) {
          idsByType[item.type] = []
        }
        idsByType[item.type].push(item.id)
      }
    } else if (response && response.type) {
      idsByType[response.type] = [response.id]
    }
    this._insertEntities(requestId, normalize({data: response}), idsByType)
  }

  _handleRequestError (requestId, error) {
    if (!(error instanceof OrbitException)) {
      this._events.emit('unhandledError', error, requestId)
      return error
    }
    const request = {
      id: requestId,
      completed: true,
      result: {},
      error: {
        message: error.message,
        description: error.description,
        type: error.type,
        id: error.id,
        relationship: error.relationship
      }
    }
    this._mergeState({
      entities: {},
      requests: {
        [requestId]: request
      }
    })
  }

  _insertEntities (requestId, entities, idsByType) {
    const request = {
      id: requestId,
      completed: true,
      result: idsByType,
      error: null
    }
    this._mergeState({
      entities: entities,
      requests: {
        [requestId]: request
      }
    })
  }

  _mergeState (mergedState) {
    const newState = Object.assign({}, this._state)
    for (let key in mergedState.entities) {
      newState.entities[key] = Object.assign({}, this._state.entities[key], mergedState.entities[key])
    }
    for (let key in mergedState.requests) {
      newState.requests[key] = Object.assign({}, this._state.requests[key], mergedState.requests[key])
    }
    this._state = newState
    this._events.emit('change', this._state)
  }
}
