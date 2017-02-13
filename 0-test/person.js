var Person = function(first, last) {
  this.first = first;
  this.last = last;
}
Person.prototype.fullName = function() {
  return this.first + " " + this.last
}

module.exports = Person
