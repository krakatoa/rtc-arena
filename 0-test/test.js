var Person = require('./person.js')

var persons = [new Person('a', 'b'), new Person('c', 'd'), new Person('e', 'f')]

for (let p of persons) {
  console.log(p.fullName())
}
