/**
 * Returns an request object from current state tree
 */
export default function requestSelector (state, requestId) {
  return state.requests[requestId]
}
