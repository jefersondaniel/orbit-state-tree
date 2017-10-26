/* eslint-env mocha */
import { requestSelector } from '../lib'
import { expect } from 'chai'

describe('requestSelector', () => {
  it('can select request', () => {
    const request = {
      completed: false
    }
    const result = requestSelector(
      {
        requests: {
          '1': request
        }
      },
      '1'
    )
    expect(result).to.equal(request)
  })
})
