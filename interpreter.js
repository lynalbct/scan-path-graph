DataDisplay = function dataDisplay( imageName, imageExt ){
	// strings
	this.string = {
		'loadData':'Loading data...',
		'parseData':'Processing data...',
		'loadImage':'Loading image...'
	};
	// Image properties
	this.imageName = imageName;
	this.imageExt = imageExt;
	this.imageWidth = 0;
	this.imageHeight = 0;
	// Cartesian plane; svg containers
	this.canvas = d3.select('#cartesian_plane');
	this.svg = this.canvas.append('svg');
	this.svgEdge = this.svg.append('g').attr('id','edgeGroup');
	this.svgEffect = this.svg.append('g').attr('id','effectGroup');
	this.svgCircle = this.svg.append('g').attr('id','circleGroup');
	this.svgHighlight = this.svg.append('g').attr('id','highlightGroup');
	// Effect control
	this.animationInterval = null;
	this.popInterval = null;
	this.colorScale = d3.scale.linear().range(['red', 'purple']).domain([0, 500]);
	// Frame control
	this.key = 0;
	// Data properties
	this.criteria = {
		'minTime' : 40,
		'errX' : 5,
		'errY' : 3
	};
	this.scaling = null;
	this.dataSize = 0;
	this.sampleRate = 0;
	this.rawData = null;
	this.fixationData = [];
	// Event properties
	this.isPaused = false;

	this.init();
};

DataDisplay.prototype.init = function(){
	// init
	this.loadImage();
};

DataDisplay.prototype.refreshOnCriteriaChange = function( minTime, errX, errY ){
	this.criteria.minTime = minTime;
	this.criteria.errX = errX;
	this.criteria.errY = errY;
	this.newLoadingScreen( this.string.parseData );
	this.parseFix();
	this.removeLoadingScreen();
	this.display();
};

DataDisplay.prototype.refreshOnDataReload = function( dName ){
	//this.loadData( dName );
};

DataDisplay.prototype.refreshOnImageReload = function( fName ){
	this.imageName = fName;
	this.loadImage();
};

// Communication

DataDisplay.prototype.loadData = function(){
	var self = this;
	this.newLoadingScreen( this.string.loadData );
	// PHP connector
	$.ajax({
		url: 'io.php?f='+this.imageName,
		dataType: 'json',
		success: function( data ){
			self.rawData = data;
			self.removeLoadingScreen();
			self.parseRaw();
			self.display();
		},
		error: function(xhr, ts, et){
			console.log(xhr);
		}
	});
};

DataDisplay.prototype.loadImage = function(){
	this.newLoadingScreen( this.string.loadImage );
	var src = 'data/'+this.imageName+this.imageExt,
	self = this,
	img = $("<img />").attr('src', src).load(function() {
		if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
			console.log('Image broken');
		} else {
			self.imageWidth = this.width;
    		self.imageHeight = this.height;
    		self.canvas
				.style('background-image','url('+src+')')
				.style('width',self.imageWidth)
				.style('height',self.imageHeight);
			self.svg
				.style('width',self.imageWidth)
				.style('height',self.imageHeight);
			self.removeLoadingScreen();
			self.loadData();
		}
	});
};

// Parser

DataDisplay.prototype.parseRaw = function(){
	this.newLoadingScreen( this.string.parseData );
	var d = [], i = 0;
	// parse loaded PHP json
	for (i = 0; i < this.rawData.data.length; i++ ){
		d.push({
			'x': this.rawData.data[i][0],
			'y': this.rawData.data[i][1]
		});
	}
	this.sampleRate = this.rawData.sample_rate;
	this.scaling = this.rawData.scale;
	this.rawData = d;
	this.parseFix();
	this.removeLoadingScreen();
};

DataDisplay.prototype.parseFix = function(){
	var d = [], i = 0, idx = 0.
		maxR = 0;
	this.criteria.errX *= this.scaling.scaleX;
	this.criteria.errY *= this.scaling.scaleY;
	for (i = 0; i < this.rawData.length; i++){
		var c = this.rawData[i],
			fixation = {
				'x': c.x,
				'y': c.y
			},
			sampleCount = 1;
		for (var j = i + 1; j < this.rawData.length; j++){
			if (
				this.calcError( this.rawData[j].x, c.x, this.criteria.errX) &&
				this.calcError( this.rawData[j].y, c.y, this.criteria.errY) ){
				sampleCount++;
				fixation.x += this.rawData[j].x;
				fixation.y += this.rawData[j].y;
			} else {
				i = j;
				break;
			}
		}
		if (this.calcInterval(sampleCount) >= this.criteria.minTime ){
			idx++;
			fixation.x = fixation.x / sampleCount;
			fixation.y = fixation.y / sampleCount;
			fixation.ftime = this.calcInterval(sampleCount);
			fixation.idx = idx;
			d.push(fixation);
			if (fixation.ftime > maxR){
				maxR = fixation.ftime;
			}
		}
	}
	for (i = 0; i < d.length; i++ ){
		d[i].r = d[i].ftime / maxR * 50;
	}
	this.dataSize = d.length;
	this.fixationData = d;
};

// Property accessors

DataDisplay.prototype.getFixationCriteria = function(){
	return this.criteria;
};

// Helper methods

DataDisplay.prototype.calcInterval = function( sampleCount ){
	return (1000 / this.sampleRate) * sampleCount;
};

DataDisplay.prototype.calcError = function( target, base, tolerance ){
	if ( target <= base + tolerance && target >= base - tolerance ){
		return true;
	} else {
		return false;
	}
};

DataDisplay.prototype.calcCircleIntersect = function( pOutside, pCircle, r ){
	var x, y,
		a = pCircle.y - pOutside.y,
		b = pCircle.x - pOutside.x,
		c = Math.sqrt(a * a + b * b),
		cos = a / c,
		sin = b / c,
		c2 = r,
		a2 = r * cos,
		b2 = r * sin;
	y = pCircle.y - a2;
	x = pCircle.x - b2;
	return {
		'x': x,
		'y': y
	}
};

// Visualization elements

DataDisplay.prototype.newCircle = function( fixation ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgCircle.append('circle');
		rect = this.canvas.append('div');
	circle.style('fill', this.colorScale(scale) )
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.attr('stroke-width', 4)
		.attr('stroke', this.colorScale(scale) )
		.attr('fill-opacity', 0.5)
		.attr('r', 0)
		.transition().duration(300)
			.attr('r', fixation.r );
	rect.attr('class', 'circle_mouse_event_receiver')
		.style('position','absolute')
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

DataDisplay.prototype.decorateCircle = function( fixation, isStart ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgHighlight.append('circle');
	circle.style('fill', 'transparent' )
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.attr('stroke-width', 4)
		.attr('stroke', 'black' )
		.attr('stroke-dasharray', '5,5')
		.attr('r', 0)
		.transition().duration(300)
			.attr('r', fixation.r + 2 );
	if (isStart){
		circle.text('S');
	} else {
		circle.text('E');
	}
};

DataDisplay.prototype.newEdge = function( from, to ){
	var scale = (from.idx + to.idx) / 2 / this.dataSize * 500,
		p1 = this.calcCircleIntersect( from, to, to.r ),
		p2 = this.calcCircleIntersect( to, from, from.r ),
		x1 = p1.x,
		y1 = p1.y,
		x2 = p2.x,
		y2 = p2.y;
	this.svgEdge.append('line')
		.attr('x1', x1)
		.attr('y1', y1)
		.attr('x2', x2)
		.attr('y2', y2)
		.attr('stroke-width', 0)
		.transition().duration(300)
			.attr('stroke-width', 3)
		.attr('stroke', this.colorScale(scale) );
};

DataDisplay.prototype.newCircleBurst = function( fixation, color ){
	this.svgEffect.append('circle')
		.attr('fill', 'transparent')
		.attr('r', fixation.r)
		.attr('cx', fixation.x)
		.attr('cy', fixation.y)
		.attr('stroke-width', 4)
		.attr('stroke', this.colorScale(color) )
		.transition().duration(400)
			.attr('r', fixation.r * 2 )
			.attr('stroke-width', 0)
			.remove();
};

DataDisplay.prototype.newEdgeWalk = function( fixation, color ){
	var idx = fixation.idx - 1, a = null, b = null, c1, c2;
	if (idx > 0){
		a = this.fixationData[idx-1];
	}
	if (idx < this.dataSize - 1){
		b = this.fixationData[idx+1];
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
	var w = 80, h = 60,
		panel = this.canvas.append('div').attr('id','infoPanel')
		.style('left',p.x - w/2)
		.style('top',p.y - h - p.r - 10)
		.style('width',w)
		.style('height',h),
		panelDiv = panel.append('div');
	if (p.idx === 1){
		panelDiv.append('a').text('#'+p.idx+' START').attr('class','text-bold');
	} else if (p.idx === this.dataSize){
		panelDiv.append('a').text('#'+p.idx+' END').attr('class','text-bold');
	} else {
		panelDiv.append('a').text('#'+p.idx).attr('class','text-bold');
	}
	panelDiv.append('a').text('x:'+parseInt(p.x)+', y:'+parseInt(p.y));
	panelDiv.append('a').text( parseInt(p.ftime)+' ms');
};

DataDisplay.prototype.removeInfo = function(){
	this.canvas.select('#infoPanel').remove();
};

DataDisplay.prototype.newLoadingScreen = function( hint ){
	var panel = this.canvas.append('div').attr('id','loadingScreen');
	panel.text( hint ).attr('class','text-bold');
};

DataDisplay.prototype.removeLoadingScreen = function(){
	this.canvas.select('#loadingScreen').remove();
};

// Data display methods

DataDisplay.prototype.stepForward = function(){
	// step frames of displaying points
	if ( this.key < this.dataSize ){
		this.newCircle( this.fixationData[this.key] );
		if (this.key !== 0){
			this.newEdge( this.fixationData[this.key - 1], this.fixationData[this.key] );
		}
		if (this.key === 0){
			this.decorateCircle(this.fixationData[this.key], true);
		} else if (this.key === this.dataSize - 1){
			this.decorateCircle(this.fixationData[this.key], false);
		}
		this.key++;
	} else {
		// notify end of data
	}
};

DataDisplay.prototype.stepBackward = function(){
	// step frames of displaying points
	if ( this.key >= 0 ){
		this.canvas.selectAll('circle_mouse_event_receiver').filter(':last-child').remove();
		this.svgCircle.selectAll('circle').filter(':last-child').remove();
		this.svgEdge.selectAll('line').filter(':last-child').remove();
		if (this.key === this.dataSize - 1 || this.key === 0){
			tihs.svgHighlight.selectAll('circle').filter(':last-child').remove();
		}
		this.key--;
	} else {
		// notify start of data
	}
};

DataDisplay.prototype.display = function(){
	this.holdHandles();
	// display all points, with edges; auto step forward
	this.key = 0;
	self = this;
	this.stepForward();
	this.popInterval = setInterval(function(){
		if ( self.key < self.dataSize ){
			self.stepForward();
		} else {
			clearInterval(self.popInterval);
			self.popInterval = null;
			self.releaseHandles();
		}
	}, 100);
};

DataDisplay.prototype.pause = function(){
	clearInterval(this.popInterval);
	this.popInterval = null;
	this.isPaused = true;
	this.releaseHandles();
};

DataDisplay.prototype.resume = function(){
	this.holdHandles();
	this.isPaused = false;
	this.popInterval = setInterval(function(){
		if ( self.key < self.dataSize ){
			self.stepForward();
		} else {
			clearInterval(self.popInterval);
			self.popInterval = null;
			self.releaseHandles();
		}
	}, 100);
}

DataDisplay.prototype.replay = function(){
	this.clear();
	this.display();
};

DataDisplay.prototype.clear = function(){
	this.canvas.selectAll('.circle_mouse_event_receiver').remove();
	this.svgCircle.selectAll('circle').remove();
	this.svgEdge.selectAll('line').remove();
	this.svgHighlight.selectAll('circle').remove();
}

// UI controls
DataDisplay.prototype.holdHandles = function(){

};

DataDisplay.prototype.releaseHandles = function(){

};