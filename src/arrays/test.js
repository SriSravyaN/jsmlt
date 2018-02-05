var expect = require('chai').expect;
var arrays = require('./index.js');

describe('Arrays', function() {
  describe('.dot', function() {
    it('should calculate the dot product of two vectors', function() {
      expect(arrays.dot([1, 2, 3], [4, 5, 6])).to.equal(32)
      expect(arrays.dot([1, 2, 3], [4, 5, 0])).to.equal(14)
      expect(arrays.dot([1, 2, 0], [4, 5, 6])).to.equal(14)
      expect(arrays.dot([1, 2, -3], [4, 5, 6])).to.equal(-4)
    });
  });

  describe('.scale', function() {
    it('should scale a vector', function() {
      expect(arrays.scale([-1, 2, 3], -2)).to.deep.equal([2, -4, -6])
      expect(arrays.scale([-1, 2, 3], 0)).to.deep.equal([-0, 0, 0])
      expect(arrays.scale([-1, 2, 3], 1)).to.deep.equal([-1, 2, 3])
      expect(arrays.scale([-1, 2, 3], 2)).to.deep.equal([-2, 4, 6])
    });

    it('should scale a multidimensional array', function() {
      expect(arrays.scale([[1, 2, 3], [-4, -5, -6]], -2)).to.deep.equal([[-2, -4, -6], [8, 10, 12]])
      expect(arrays.scale([[1, 2, 3], [-4, -5, -6]], 0)).to.deep.equal([[0, 0, 0], [-0, -0, -0]])
      expect(arrays.scale([[1, 2, 3], [-4, -5, -6]], 1)).to.deep.equal([[1, 2, 3], [-4, -5, -6]])
      expect(arrays.scale([[1, 2, 3], [-4, -5, -6]], 2)).to.deep.equal([[2, 4, 6], [-8, -10, -12]])
    });
  });

  describe('.flatten', function() {
    it('should not modify a 1-dimensional array', function() {
      var A = [8, 2, 7, 2, 6, 1, 3, 4, 3, 3, 8, 7];
      var B = arrays.flatten(A);

      expect(A).to.deep.equal(B);
    });

    it('should correctly flatten a multidimensional array', function() {
      var A = [[[8, 2, 7], [2, 6, 1]], [[3, 4, 3], [3, 8, 7]]];
      var B = arrays.flatten(A);

      expect(B).to.deep.equal([8, 2, 7, 2, 6, 1, 3, 4, 3, 3, 8, 7]);
    });
  });

  describe('.reshape', function() {
    it('should correctly reshape a vector to a multidimensional shape', function() {
      var A = [8, 2, 7, 2, 6, 1, 3, 4, 3, 3, 8, 7];
      var shape = [3, 4];
      var B = arrays.reshape(A, shape);

      expect(arrays.flatten(B)).to.deep.equal(arrays.flatten(A))
      expect(arrays.getShape(B)).to.deep.equal(shape)
    });

    it('should correctly reshape a vector to a multidimensional shape with one-dimensions', function() {
      var A = [8, 2, 7, 2, 6, 1, 3, 4, 3, 3, 8, 7];
      var shape = [3, 1, 4, 1, 1];
      var B = arrays.reshape(A, shape);

      expect(arrays.flatten(B)).to.deep.equal(arrays.flatten(A))
      expect(arrays.getShape(B)).to.deep.equal(shape)
    });

    it('should correctly reshape a multidimensional shape to a vector', function() {
      var A = [[8, 2, 7], [2, 6, 1], [3, 4, 3], [3, 8, 7]];
      var shape = [12];
      var B = arrays.reshape(A, shape);

      expect(arrays.flatten(B)).to.deep.equal(arrays.flatten(A))
      expect(arrays.getShape(B)).to.deep.equal(shape)
    });

    it('should correctly reshape a multidimensional shape to another multidimensional shape', function() {
      var A = [[8, 2, 7], [2, 6, 1], [3, 4, 3], [3, 8, 7]];
      var shape = [2, 2, 3];
      var B = arrays.reshape(A, shape);

      expect(arrays.flatten(B)).to.deep.equal(arrays.flatten(A))
      expect(arrays.getShape(B)).to.deep.equal(shape)
    });
  });
});