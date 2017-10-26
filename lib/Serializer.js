import Jsona from 'jsona'
import invariant from 'invariant'

/**
 * Serialize plain objects into json api format
 */
export default class Serializer {
  constructor (schema) {
    this._formatter = new Jsona()
    this._schema = schema
  }

  /**
   * Augment object with attributes needed by formatter
   *
   * @param {String} type Object type
   * @param {Object} object
   */
  _augmentObject (type, object) {
    const relationships = this._schema.models[type].relationships
    const relationshipNames = relationships ? Object.keys(relationships) : []

    for (let relationshipName of relationshipNames) {
      if (!object[relationshipName]) {
        continue
      }
      if (Array.isArray(object[relationshipName])) {
        object[relationshipName] = object[relationshipName].map(
          relationshipObject => this._augmentObject(relationships[relationshipName].model, relationshipObject)
        )
        continue
      }
      object[relationshipName] = this._augmentObject(relationships[relationshipName].model, object[relationshipName])
    }

    return Object.assign(
      {
        type: type,
        relationshipNames: relationshipNames
      },
      object
    )
  }

  /**
   * Serialize an object into json api format
   *
   * @param {String} type Object type
   * @param {Object} object Object
   * @returns {Object}
   */
  serialize (type, object) {
    invariant(type in this._schema.models, 'serialized type must exist in schema')
    return this._formatter.serialize({stuff: this._augmentObject(type, object)})
  }
}
