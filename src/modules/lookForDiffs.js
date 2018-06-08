import Promise from 'bluebird'
import _ from 'lodash'
// const nano = require('nano')(`https://${env.db.user}:${env.db.pass}@${env.db.url}`)
// const remoteDB = nano.db.use('producto_2')
// create Promise-compatible versions of all functions
// Promise.promisifyAll(remoteDB)

export class LookForDiffs {
  constructor (fireDB) {
    this.fireDB = fireDB
    this.csvProds = []
    this.couchProds = []

    /** *** FIREBASE *****/
    // As an admin, the app has access to read and write all data, regardless of Security Rules
    this.refProducts = fireDB.ref('products/')
    /** *** end FIREBASE *****/
  }

  binarySearch (arr, property, search) {
    let low = 0
    let high = arr.length
    let mid
    while (low < high) {
      mid = (low + high) >>> 1 // faster version of Math.floor((low + high) / 2)
      arr[mid][property] < search ? low = mid + 1 : high = mid
    }
    return low
  }

  checkAndResolve (csvProds, fireProds) {
    return new Promise((resolve, reject) => {
      let prodstoUpdate = []
      _.each(fireProds, fireProd => {
        // declaro la referencia al producto que quiero actualizar en firebase
        let refProduct = this.refProducts.child(fireProd._id)
        // busco el producto de firebase en el csv con los productos a ver si esta
        let iCsvProd = this.binarySearch(csvProds, 'codigo', fireProd._id)
        if (_.has(csvProds[iCsvProd], 'codigo') && csvProds[iCsvProd].codigo === fireProd._id) {
          // si el producto esta en el csv y la cantidad es diferente a la cantidad en firebase, entonces actualizo el produto en firebase
          if (fireProd.existencias !== parseInt(csvProds[iCsvProd].cantInventario, 10)) {
            // agrego el producto aun array con los productos modificados para llevar un registro
            prodstoUpdate.push(fireProd)
            refProduct.update({
              origen: 'sap',
              updated_at: Date.now(),
              existencias: parseInt(csvProds[iCsvProd].cantInventario, 10)
            }, err => {
              reject(err)
            })
          }
        } else {
          refProduct.remove().then(() => {
            fireProd._deleted = true
            prodstoUpdate.push(fireProd)
          }).catch(err => {
            reject(err)
          })
        }
      })
      // si todo sale bien retorno un array con los productos modificados para llevar un log
      resolve(prodstoUpdate)
    })
  }
}
