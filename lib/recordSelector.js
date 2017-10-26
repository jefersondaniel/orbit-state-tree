import build from 'redux-object'

/**
 * Return a record from current state tree
 */
export default function recordSelector (state, type, id) {
  return build(state.entities, type, id)
}
