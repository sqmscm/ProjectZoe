/*
Project Zoe
https://github.com/sqmscm/ProjectZoe
*/

var Piece = function(a, setWidth, setHeight, setSide) {
  var o = {
    style: "rect",
    property: "image",
    x: 0,
    y: 0,
    width: setWidth,
    height: setHeight,
    board_x: -1,
    board_y: -1,
    prev_x: -1,
    prev_y: -1,
    side: setSide,
  }

  o.img = a;
  return o;
}

var Cell = function(setX, setY, setWidth, setHeight, setColor) {
  //Object
  var o = {
    width: setWidth,
    height: setHeight,
    x: setX,
    y: setY,
    style: "rect",
    color: setColor,
  }

  return o;
}
//A Simple Image
var SImage = function(a) {
  var o = {
    style: "rect",
    property: "image",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }
  o.img = a;
  o.width = o.img.width;
  o.height = o.img.height;
  return o;
}
