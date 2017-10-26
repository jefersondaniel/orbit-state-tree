/* eslint-env mocha */
import { recordSelector } from '../lib'
import { expect } from 'chai'

describe('recordSelector', () => {
  it('can select record', () => {
    const result = recordSelector(
      {
        entities: {
          planet: {
            'earth': {
              attributes: {
                name: 'Earth'
              }
            }
          }
        }
      },
      'planet',
      'earth'
    )
    expect(result).to.deep.equal({id: 'earth', name: 'Earth'})
  })
})
