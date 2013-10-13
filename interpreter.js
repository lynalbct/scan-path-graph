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
	this.totalTime = 0;
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
			self.populateUiHandles();
			self.display();
		},
		error: function(xhr, ts, et){
			console.log(xhr);
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
	this.totalTime = this.calcInterval(d.length);
	this.parseFix();
	this.removeLoadingScreen();
};

DataDisplay.prototype.parseFix = function(){
	var d = [], i = 0, idx = 0.
		maxR = 0;
	this.criteria.errX *= this.scaling.scaleX;
	this.criteria.errY *= this.scaling.scaleY;
	var c,
	rawArray = {
		'x': [],
		'y': [],
		'start': 0
	},
	fixation = {},
	radiusMin = 5;
	radiusMax = 40;

	var c = this.rawData[i];
	rawArray.x.push(c.x);
	rawArray.y.push(c.y);
	rawArray.start = this.calcInterval(i);
	for (i = 0; i < this.rawData.length - 1; i++){
		if (
			this.calcError( this.rawData[i+1].x, this.rawData[i].x, this.criteria.errX) &&
			this.calcError( this.rawData[i+1].y, this.rawData[i].y, this.criteria.errY) ){
			rawArray.x.push(this.rawData[i+1].x);
			rawArray.y.push(this.rawData[i+1].y);
		} else {
			if (this.calcInterval(rawArray.x.length) >= this.criteria.minTime ){
				idx++;
				fixation.x = this.calcAvg(rawArray.x);
				fixation.y = this.calcAvg(rawArray.y);
				fixation.ftime = this.calcInterval(rawArray.x.length);
				fixation.stdX = this.calcStd(rawArray.x);
				fixation.stdY = this.calcStd(rawArray.y);
				fixation.idx = idx;
				fixation.start = rawArray.start;
				fixation.end = rawArray.start + this.calcInterval(rawArray.x.length);
				d.push(fixation);
				if (fixation.ftime > maxR){
					maxR = fixation.ftime;
				}
				fixation = {};
			}
			rawArray = {
				'x': [],
				'y': [],
				'start': 0
			};
			c = this.rawData[i];
			rawArray.x.push(c.x);
			rawArray.y.push(c.y);
			rawArray.start = this.calcInterval(i);
		}
	}
	for (i = 0; i < d.length; i++ ){
		d[i].r = d[i].ftime / maxR * (radiusMax - radiusMin) + radiusMin;
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

DataDisplay.prototype.calcStd = function( array ){
	var avg = this.calcAvg(array), i,
	sum = 0;
	for (i = 0; i < array.length; i++){
		sum += Math.pow(array[i] - avg, 2);
	}
	return Math.sqrt( sum / array.length );
};

DataDisplay.prototype.calcAvg = function( array ){
	var sum = 0, i;
	for (i = 0; i < array.length; i++){
		sum += array[i];
	}
	return sum / array.length;
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

DataDisplay.prototype.calcScreenCenterV = function(){
	var pos = ( parseInt(this.canvas.style('height')) - parseInt(this.canvas.style('margin-top')) )/ 2;
	return pos;
}

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
		.attr('fill-opacity', 0.3)
		.attr('r', 0)
		.transition().duration(300)
			.attr('r', fixation.r );
	rect.attr('class', 'circle_mouse_event_receiver')
		.attr('id', 'circle_mouse_event_receiver_'+fixation.idx)
		.style('position','absolute')
		.style('left', fixation.x - fixation.r)
		.style('top', fixation.y - fixation.r)
		.style('width', fixation.r * 2)
		.style('height', fixation.r * 2);
	rect.on('mouseenter', function(){
			self.newInfo( fixation );
			self.newCircleBurst( fixation, scale );
			self.newEdgeWalk( fixation, scale );
			self.newFixationSpread( fixation, scale );
			self.dimUnrelated( fixation.idx );
			self.animationInterval = setInterval(function(){
				self.newCircleBurst( fixation, scale );
				self.newEdgeWalk( fixation, scale );
				self.newFixationSpread( fixation, scale );
			}, 2000);
			self.trigger('customMouseIn',self.canvas.select('#slidebar_key_'+fixation.idx).node());
			self.canvas.select('#slidebar_key_'+fixation.idx)
				.style('opacity',0.8)
				.style('height','2.4em');
		})
		.on('mouseleave', function(){
			self.removeInfo();
			self.lightAll();
			clearInterval(self.animationInterval);
			self.trigger('customMouseOut',self.canvas.select('#slidebar_key_'+fixation.idx).node());
			self.canvas.select('#slidebar_key_'+fixation.idx)
				.style('opacity',0.2)
				.style('height','2.2em');
		});
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

DataDisplay.prototype.newInfo = function( p ){
	var w = 80, h = 60,
		top = p.y - h - p.r - 10;
	if (top < 0){
		top = p.y + p.r + 10;
	}
	var panel = this.canvas.append('div').attr('id','infoPanel')
		.style('left',p.x - w/2)
		.style('top', top)
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

DataDisplay.prototype.newRollover = function(){

};

DataDisplay.prototype.removeRollover = function(){

};

// DOM decorations

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

DataDisplay.prototype.newFixationSpread = function( fixation, color ){
	var rect = this.svgHighlight.append('rect');
	rect.attr('x', fixation.x - fixation.stdX)
		.attr('y', fixation.y - fixation.stdY)
		.attr('fill', this.colorScale(color))
		.attr('width', fixation.stdX * 2)
		.attr('height', fixation.stdY * 2)
		.attr('opacity', 0)
		.transition().duration(400).attr('opacity', 1.0).transition().duration(400).attr('opacity', 0).remove();
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

DataDisplay.prototype.dimUnrelated = function( idx ){
	this.svgCircle.selectAll('circle').filter(':not(:nth-child('+idx+'))').transition().style('opacity', 0.3);
	var edgeSelection;
	if (idx > 1 && idx < this.dataSize){
		edgeSelection = this.svgEdge.selectAll('line').filter(':not(:nth-child('+idx+'))').filter(':not(:nth-child('+(idx-1)+'))');
	} else if (idx === 1){
		edgeSelection = this.svgEdge.selectAll('line').filter(':not(:nth-child('+idx+'))');
	} else {
		edgeSelection = this.svgEdge.selectAll('line').filter(':not(:nth-child('+(idx-1)+'))');
	}
	edgeSelection.transition().style('opacity', 0.3);
};

DataDisplay.prototype.lightAll = function(){
	this.svgCircle.selectAll('circle').transition().style('opacity', 1.0);
	this.svgEdge.selectAll('line').transition().style('opacity', 1.0);
};

// Data display methods

DataDisplay.prototype.stepForward = function(){
	// step frames of displaying points
	if ( this.key < this.dataSize ){
		this.newCircle( this.fixationData[this.key] );
		this.newSlidebarKey( this.fixationData[this.key] );
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
		this.canvas.select('#slidebar').selectAll('.slidebar_key').filter(':last-child').remove();
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
	d3.select('body').append('div').attr('id','blocking');
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
			d3.select('body').select('#blocking').remove();
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
	this.canvas.select('#handles').append('div').attr('id','blocking');
	this.canvas.select('#handles').style('opacity',0.2);
};

DataDisplay.prototype.releaseHandles = function(){
	this.canvas.select('#handles').select('#blocking').remove();
	this.canvas.select('#handles').style('opacity',1);
};

DataDisplay.prototype.trigger = function(event, target){
	var evt = document.createEvent('MouseEvents');
	evt.initMouseEvent(event, false, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	target.dispatchEvent(evt);
}

DataDisplay.prototype.newSlidebarKey = function( fixation ){
	var slidebar = this.canvas.select('#slidebar'),
		totalW = parseInt(slidebar.style('width')),
		scaleS = fixation.start / this.totalTime,
		scaleE = fixation.end / this.totalTime,
		l = scaleS * totalW,
		w = (scaleE - scaleS) * totalW,
		self = this,
		rect = self.canvas.select('#circle_mouse_event_receiver_'+fixation.idx).node(),
		key = slidebar.append('div').attr('class','slidebar_key').attr('id','slidebar_key_'+fixation.idx).style('left', l).style('width', w);
	key.on('mouseenter', function(){
			self.trigger('mouseenter', rect);
			slidebar.append('div').attr('class','slidebar_key_decor').style('left', l).text(fixation.idx);
		})
		.on('mouseleave', function(){
			self.trigger('mouseleave', rect);
			slidebar.selectAll('.slidebar_key_decor').remove();
		})
		// Prevent infinite loop on event calls
		.on('customMouseIn', function(){
			slidebar.append('div').attr('class','slidebar_key_decor').style('left', l).text(fixation.idx);
		})
		.on('customMouseOut', function(){
			slidebar.selectAll('.slidebar_key_decor').remove();
		});
};

DataDisplay.prototype.populateUiHandles = function(){
	var panel = this.newPanel('handles'),
		slidebarLayout = panel.append('div').attr('class','vertical_layout');
		userControlLayout = panel.append('div').attr('class','vertical_layout');
	slidebarLayout
		.append('div').attr('id','slidebar');
	var playback = userControlLayout.append('div').attr('id','playback'),
		settings = userControlLayout.append('div').attr('id','settings');
	panel.style('top', this.imageHeight);
	/*
	playback.append(this.newButton('stepbackButton','Step backward')[0][0]);
	playback.append(this.newButton('playButton','Play')[0][0]);
	playback.append(this.newButton('stepforButton','Step forward')[0][0]);
	settings.append(this.newInput('Dev V: ')[0][0]);
	settings.append(this.newInput('Dev H: ')[0][0]);
	settings.append(this.newInput('Threshold(ms): ')[0][0]);
	*/
};

DataDisplay.prototype.newButton = function( id, hint ){

};

DataDisplay.prototype.newInput = function( label ){

};

DataDisplay.prototype.newPanel = function( id ){
	var panel = this.canvas.append('div').attr('class','panel').attr('id',id);
	return panel;
};

DataDisplay.prototype.removePanel = function( id ){
	this.canvas.select('#'+id).remove();
};

DataDisplay.prototype.newLoadingScreen = function( hint ){
	var panel = this.newPanel('loadingScreen'),
	screen = panel.append('div').attr('class','loadingScreen');
	screen.text( hint );
	panel.style('top', this.calcScreenCenterV() - parseInt(panel.style('height')) / 2 );
};

DataDisplay.prototype.removeLoadingScreen = function(){
	this.canvas.select('#loadingScreen').remove();
};