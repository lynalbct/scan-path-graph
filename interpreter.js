Ajaxer = function ajaxer(){

};

Ajaxer.prototype.getImage = function( fname ){
	// Simple Ajax call
};

Ajaxer.prototype.getData = function( fname ){
	// PHP connector
	$.ajax({
		url: "io.php?f="+fname,
		dataType: 'json',
		success: function( data ){
			graph = new DataDisplay(image_src, data);
		},
		error: function(xhr, ts, et){
			console.log(xhr)
		}
	});
};

Ajaxer.prototype.postFile = function( fname ){
	// For uploading
};

DataDisplay = function dataDisplay( imageSrc, jsonData ){
	// image
	this.imageSrc = imageSrc;
	this.imageWidth = 0;
	this.imageHeight = 0;
	// cartesian plane
	this.canvas = d3.select('#cartesian_plane')
		// tmp
			.style('width',1600)
			.style('height',676);
	this.svg = this.canvas.append('svg')
		// tmp
		.style('width',1600)
		.style('height',676);
	this.svgEdge = this.svg.append('g').attr('id','edgeGroup');
	this.svgEffect = this.svg.append('g').attr('id','effectGroup');
	this.svgCircle = this.svg.append('g').attr('id','circleGroup');
	// effects
	this.animationInterval = null;
	this.colorScale = d3.scale.linear().range(['red', 'purple']).domain([0, 500]);
	// frame control
	this.key = 0;
	// data
	this.dataSize = 0;
	this.data = jsonData;

	this.init();
};

DataDisplay.prototype.newCircle = function( fixation ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgCircle.append('circle');
		rect = this.canvas.append('div');
	circle.style('fill', this.colorScale(scale) )
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.attr('r', 0)
		.transition().duration(300)
			.attr('r', fixation.r);
	rect.style('position','absolute')
		.style('left', fixation.x - fixation.r)
		.style('top', fixation.y - fixation.r)
		.style('width', fixation.r * 2)
		.style('height', fixation.r * 2);
	rect.on('mouseenter', function(){
			self.newInfo( fixation );
			self.newCircleBurst( fixation, scale );
			self.newEdgeWalk( fixation, scale );
			self.animationInterval = setInterval(function(){
				self.newCircleBurst( fixation, scale );
				self.newEdgeWalk( fixation, scale );
			}, 2000);
		})
		.on('mouseleave', function(){
			self.removeInfo();
			clearInterval(self.animationInterval);
		});
};

DataDisplay.prototype.newEdge = function( from, to ){
	var scale = (from.idx + to.idx) / 2 / this.dataSize * 500;
	this.svgEdge.append('line')
		.attr('x1', from.x)
		.attr('y1', from.y)
		.attr('x2', to.x)
		.attr('y2', to.y)
		.attr('stroke-width', 0)
		.transition().duration(300)
			.attr('stroke-width', 3)
		.attr('stroke', this.colorScale(scale) );
};

DataDisplay.prototype.newCircleBurst = function( fixation, color ){
	this.svgEffect.append('circle')
		.attr('fill', 'transparent')
		.attr('r', fixation.r - 4)
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.attr('stroke-width', 8)
		.attr('stroke', this.colorScale(color) )
		.transition().duration(400)
			.attr('r', fixation.r * 2 )
			.attr('stroke-width', 0)
			.remove();
};

DataDisplay.prototype.newEdgeWalk = function( fixation, color ){
	var idx = fixation.idx - 1, a = null, b = null, c1, c2;
	if (idx > 0){
		a = this.data[idx-1];
	}
	if (idx < this.dataSize - 1){
		b = this.data[idx+1];
	}
	if (a !== null){
		c1 = this.svgEffect.append('circle')
		.attr('fill', this.colorScale(color))
		.attr('r', 5)
		.attr('cx', a.x)
		.attr('cy', a.y)
		.transition().duration(400)
			.attr('cx', fixation.x)
			.attr('cy', fixation.y)
			.remove();
	}
	if (b !== null){
		c2 = this.svgEffect.append('circle')
		.attr('fill', this.colorScale(color))
		.attr('r', 5)
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.transition().duration(400)
			.attr('cx', b.x)
			.attr('cy', b.y)
			.remove();
	}
};

DataDisplay.prototype.newInfo = function( p ){
	var w = 80, h = 45,
		panel = this.canvas.append('div').attr('id','infoPanel')
		.style('left',p.x - w/2)
		.style('top',p.y - h - p.r - 10)
		.style('width',w)
		.style('height',h),
		panelDiv = panel.append('div');
	panelDiv.append('a').text('#'+p.idx).attr('class','text-bold');
	panelDiv.append('a').text('x:'+parseInt(p.x)+', y:'+parseInt(p.y));
};

DataDisplay.prototype.removeInfo = function(){
	this.canvas.select('#infoPanel').remove();
};

DataDisplay.prototype.init = function(){
	// DOM init
	// this.loadImage( this.imageSrc );
	// parse data
	this.parseData(this.data);
	this.display();
};

DataDisplay.prototype.loadImage = function( src ){
	// load image into DOM
	//Ajaxer and get W H
	this.canvas
		.style('background-image',src)
		.style('width',this.imageWidth)
		.style('height',this.imageHeight);
	this.canvasSVG
		.style('width',this.imageWidth)
		.style('height',this.imageHeight);
};

DataDisplay.prototype.parseData = function( json ){
	var d = [], i = 0;
	// parse loaded PHP json
	while( json.hasOwnProperty(i) ){
		d.push({
			'x': json[i][0],
			'y': json[i][1],
			'r': json[i][2] / 5 / 2 > 5 ? json[i][2] / 5 / 2 : 5,
			'idx': i+1
		});
		i++;
	}
	this.dataSize = i;
	this.data = d;
};

DataDisplay.prototype.stepForward = function(){
	// step frames of displaying points
	if ( this.key < this.dataSize ){
		this.newCircle( this.data[this.key] );
		if (this.key !== 0){
			this.newEdge( this.data[this.key - 1], this.data[this.key] );
		}
		this.key++;
	} else {
		// notify end of data
	}
};

DataDisplay.prototype.stepBackward = function(){
	// step frames of displaying points
	if ( this.key >= 0 ){
		this.key--;
	} else {
		// notify start of data
	}
};

DataDisplay.prototype.display = function(){
	// display all points, with edges; auto step forward
	this.key = 0;
	self = this;
	self.stepForward();
	var popInterval = setInterval(function(){
		if ( self.key < self.dataSize ){
			self.stepForward();
		} else {
			clearInterval(popInterval);
		}
	}, 100);
};

var image_src = '', graph = null;

window.onload = function(){
	var ajxr = new Ajaxer();
	ajxr.getData('NancyComic_Rescaled_24Bit');
};