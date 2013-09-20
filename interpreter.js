Ajaxer = function ajaxer(){

};

Ajaxer.prototype.getData = function( fname ){
	// PHP connector
};

Ajaxer.prototype.postData = function( fname ){
	// PHP connecter
};

Ajaxer.prototype.getImage = function( fname ){
	// PHP connector
};

Ajaxer.prototype.postImage = function( fname ){
	// PHP connector
}

DataDisplay = function dataDisplay( imageSrc, jsonData ){
	// image properties
	// cartesian plane properties
	// edge properties
	// point properties
	// object properties
		// frame control
		// data
};

DataDisplay.prototype.init = function(){
	// DOM init; event binding
	// parse data
}

DataDisplay.prototype.loadImage = function( src ){
	// load image into DOM
};

DataDisplay.prototype.parseData = function( json ){
	// parse loaded PHP json
	// calculate fixation points
};

DataDisplay.prototype.stepForward = function(){
	// step frames of displaying points
};

DataDisplay.prototype.stepBackward = function(){
	// step frames of displaying points
};

DataDisplay.prototype.display = function(){
	// display all points, with edges; auto step forward
};

var test_data = {
	'1': [50,80],
	'2': [140,70],
	'3': [243,94]
};

var image_src = '', graph = new DataDisplay(image_src, test_data);
graph.display();