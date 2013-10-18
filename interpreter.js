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
		maxR = Number.NEGATIVE_INFINITY, minR = Number.POSITIVE_INFINITY,
		maxDisp = Number.NEGATIVE_INFINITY;
	this.criteria.errX *= this.scaling.scaleX;
	this.criteria.errY *= this.scaling.scaleY;
	var c,
	rawArray = {
		'x': [],
		'y': [],
		'start': 0
	},
	fixation = {},
	radiusMin = 2;
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
				fixation.dispersion = this.calc2dDispersion(rawArray.x, rawArray.y);
				fixation.idx = idx;
				fixation.start = rawArray.start;
				fixation.end = rawArray.start + this.calcInterval(rawArray.x.length);
				d.push(fixation);
				if (fixation.ftime > maxR){
					maxR = fixation.ftime;
				} else if (fixation.ftime < minR){
					minR = fixation.ftime;
				}
				if (fixation.dispersion > maxDisp){
					maxDisp = fixation.dispersion;
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
		d[i].r = (d[i].ftime - minR) / (maxR - minR) * (radiusMax - radiusMin) + radiusMin;
		d[i].relativeDisp = d[i].dispersion / maxDisp;
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

DataDisplay.prototype.calc2dDispersion = function( arrayX, arrayY ){
	var avgX = this.calcAvg(arrayX), avgY = this.calcAvg(arrayY),
		squareError = 0, i = 0;
	for (i; i < arrayX.length; i++){
		squareError+= ( Math.pow(arrayX[i] - avgX, 2) + Math.pow(arrayY[i] - avgY, 2) );
	}
	return Math.sqrt( squareError / arrayX.length );
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

DataDisplay.prototype.calcDistance = function( a, b ){
	var y = a.y - b.y,
		x = a.x - b.x;
	return Math.sqrt(x * x + y * y);
};

DataDisplay.prototype.calcScreenCenterV = function(){
	var pos = window.innerHeight / 2;
	return pos;
};

// Visualization elements

DataDisplay.prototype.newCircle = function( fixation ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgCircle.append('circle');
		rect = this.canvas.append('div');
	var effect = function(){
		self.newEdgeWalk( fixation, scale );
		self.dimUnrelated( fixation.idx );
		self.animationInterval = setInterval(function(){
			self.newEdgeWalk( fixation, scale );
		}, 2000);
		self.trigger('customMouseIn',self.canvas.select('#slidebar_key_'+fixation.idx).node());
		self.canvas.select('#slidebar_key_'+fixation.idx)
			.style('background-color','rgba(0,0,0,0.8)');
	};
	circle.style('fill', this.colorScale(scale) )
		.attr('cx', fixation.x).attr('cy', fixation.y)
		.attr('stroke-width', 4).attr('stroke', this.colorScale(scale) )
		.attr('fill-opacity', 0.3)
		.attr('r', 0).transition().duration(300).attr('r', fixation.r );
	rect.attr('class', 'circle_mouse_event_receiver')
		.attr('id', 'circle_mouse_event_receiver_'+fixation.idx)
		.style('position','absolute')
		.style('left', fixation.x - fixation.r).style('top', fixation.y - fixation.r)
		.style('width', fixation.r * 2).style('height', fixation.r * 2);
	rect.on('mouseenter', function(){
			self.removeRollover();
			self.newRollover( fixation );
			effect();
		})
		.on('mousefocus', function(){
			effect();
		})
		.on('mouseleave', function(){
			self.lightAll();
			clearInterval(self.animationInterval);
			self.trigger('customMouseOut',self.canvas.select('#slidebar_key_'+fixation.idx).node());
			self.canvas.select('#slidebar_key_'+fixation.idx)
				.style('background-color','rgba(0,0,0,0.2)');
		});
};

DataDisplay.prototype.newEdge = function( from, to ){
	var scale = (from.idx + to.idx) / 2 / this.dataSize * 500,
		p1 = this.calcCircleIntersect( from, to, to.r ),
		p2 = this.calcCircleIntersect( to, from, from.r ),
		x1 = p1.x, y1 = p1.y,
		x2 = p2.x, y2 = p2.y;
	this.svgEdge.append('line')
		.attr('x1', x1).attr('y1', y1)
		.attr('x2', x2).attr('y2', y2)
		.attr('stroke-width', 0).transition().duration(300).attr('stroke-width', 3)
		.attr('stroke', this.colorScale(scale) );
};

DataDisplay.prototype.newInfo = function( p ){
	var w = 80, h = 60,
		top = p.y - h - p.r - 10;
	if (top < 0){
		top = p.y + p.r + 10;
	}
	var panel = this.canvas.append('div').attr('id','infoPanel')
		.style('left',p.x - w/2).style('top', top)
		.style('width',w).style('height',h),
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

DataDisplay.prototype.newRollover = function( p ){
	var overlap = [], i, maxL = p.x - p.r, maxR = p.x + p.r, self = this;
	for (i = 0; i < this.fixationData.length; i++){
		var f = this.fixationData[i];
		if (p.r > this.calcDistance(f, p)){
			if (f.x - f.r < maxL){
				maxL = f.x - f.r;
			}
			if (f.x + f.r > maxR){
				maxR = f.x + f.r
			}
			overlap.push(f);
		}
	}
	if (overlap.length > 1){
		var w = 80,
			left = maxR;
		if (left + w > this.imageWidth){
			left = maxL - w;
		}
		var panel = this.canvas.append('div').attr('id','rolloverPanel')
				.style('left',left)
				.style('max-width',w);
		for (i = 0; i < overlap.length; i++){
			var node = panel.append('div');
			node.text('#'+overlap[i].idx+' '+parseInt(overlap[i].ftime)+'ms').attr('class','text-bold');
			node.attr('data','#circle_mouse_event_receiver_'+overlap[i].idx);
		}
		panel.selectAll('div')
			.on('mouseenter', function(){
				var rect = self.canvas.select(d3.select(this).attr('data')).node();
				self.trigger('mousefocus', rect);
			})
			.on('mouseleave', function(){
				var rect = self.canvas.select(d3.select(this).attr('data')).node();
				self.trigger('mouseleave', rect);
			});
		panel.style( 'top', p.y - parseInt(panel.style('height')) / 2);
		panel.on('mouseleave', this.removeRollover.bind(this));
	}
};

DataDisplay.prototype.removeRollover = function(){
	this.canvas.select('#rolloverPanel').remove();
};

// DOM decorations

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
		.attr('cx', a.x).attr('cy', a.y)
		.transition().duration(400)
			.attr('cx', fixation.x).attr('cy', fixation.y)
			.remove();
	}
	if (b !== null){
		c2 = this.svgEffect.append('circle')
		.attr('fill', this.colorScale(color))
		.attr('r', 5)
		.attr('cx', fixation.x).attr('cy', fixation.y)
		.transition().duration(400)
			.attr('cx', b.x).attr('cy', b.y)
			.remove();
	}
};

DataDisplay.prototype.decorateCircle = function( fixation, isStart ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgHighlight.append('circle');
	circle.style('fill', 'transparent' )
		.attr('cx', fixation.x).attr('cy', fixation.y)
		.attr('stroke-width', 4)
		.attr('stroke', 'black' )
		.attr('stroke-dasharray', '5,5')
		.attr('r', 0)
		.transition().duration(300)
			.attr('r', fixation.r + 2 );
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
	this.canvas.append('div').attr('id','blocking');
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
	key.style( 'height', parseInt(key.style('height')) * (1 + fixation.relativeDisp) );
	key.on('mouseenter', function(){
			self.trigger('mousefocus', rect);
			self.newInfo(fixation);
		})
		.on('mouseleave', function(){
			self.trigger('mouseleave', rect);
			self.removeInfo();
		})
		// Prevent infinite loop on event calls
		.on('customMouseIn', function(){
			self.newInfo(fixation);
		})
		.on('customMouseOut', function(){
			self.removeInfo();
		});
};

DataDisplay.prototype.populateUiHandles = function(){
	var panel = this.newPanel('handles'),
		slidebarLayout = panel.append('div').attr('class','vertical_layout'),
		settings = slidebarLayout.append('div').attr('id','settings'),
		playback = slidebarLayout.append('div').attr('id','playback');
	slidebarLayout.append('div').attr('id','slidebar');
	panel.style('top', 0).style('position','fixed');

	this.newButton('stepbackButton','Step backward', playback);
	this.newButton('playButton','Play', playback);
	this.newButton('stepforButton','Step forward', playback);
	this.newSeparator( playback );

	this.newButton('settingsDropdown','Settings', settings);
	this.newSeparator( settings );
	var settingsDropdown = settings.append('div').attr('class','listPanel')
		.style('left',0).style('top',panel.style('height')).style('display','none');
	settingsDropdown.on('mouseleave', function(){ d3.select(this).style('display','none'); });
	settings.select('#settingsDropdown').on('click', function(){
		settingsDropdown.style('display') === 'none' ?
			settingsDropdown.style('display','block') : settingsDropdown.style('display','none');
	});

	var paramLayout = settingsDropdown.append('div').attr('class','vertical_layout'),
		paramTable = paramLayout.append('table').append('tbody').append('tr');
		paramTable.append('td');
		paramTable.append('td');
	var labelCell = paramTable.selectAll('td').filter(':first-child'),
		inputCell = paramTable.selectAll('td').filter(':last-child');

	this.newLabel('Fixation settings: ', labelCell.append('div'));
	this.newLabel('Dev V: ', labelCell.append('div'));
	this.newLabel('Dev H: ', labelCell.append('div'));
	this.newLabel('Threshold(ms): ', labelCell.append('div'));

	this.newLabel('Filter: ', labelCell.append('div'));
	var label2 = labelCell.append('div'),
		label3 = labelCell.append('div'),
		label4 = labelCell.append('div'),
		label5 = labelCell.append('div');
	this.newRadio('filterAll', label2, true);
	this.newLabel('All', label2);
	this.newRadio('filterTime', label3);
	this.newLabel('Time range: ', label3);
	this.newRadio('filterNum', label4);
	this.newLabel('Data point #: ', label4);
	this.newRadio('filterDuration', label5);
	this.newLabel('Duration: ', label5);

	inputCell.append('div').text(' ');
	this.newInput('devHInput', inputCell.append('div'));
	this.newInput('devVInput', inputCell.append('div'));
	this.newInput('thresholdInput', inputCell.append('div'));
	inputCell.append('div').text(' ');
	inputCell.append('div').text(' ');
	var filter2 = inputCell.append('div'),
		filter3 = inputCell.append('div'),
		filter4 = inputCell.append('div');
	this.newInput('filterTime_s', filter2);
	this.newInput('filterTime_e', filter2);
	this.newInput('filterNum_s', filter3);
	this.newInput('filterNum_e', filter3);
	this.newInput('filterDura_s', filter4);
	this.newInput('filterDura_e', filter4);

	this.canvas.style('margin-top',panel.style('height'));
};

DataDisplay.prototype.newButton = function( id, hint, context ){
	context.append('a').attr('id',id).attr('title',hint).attr('class','ui_button');
};

DataDisplay.prototype.newInput = function( id, context ){
	context.append('input').attr('id',id).attr('class','ui_input').style('margin','auto 0.25em');
};

DataDisplay.prototype.newLabel = function( label, context ){
	context.append('div').attr('class','ui_input_label').style('margin-left','0.25em').text(label);
};

DataDisplay.prototype.newRadio = function( id, context, checked ){
	context.append('input')
		.attr({
			'type': 'radio',
			'id': id,
			'name': 'choices'
		})
		.property('checked', checked);
}

DataDisplay.prototype.newSeparator = function( context ){
	context.append('div').attr('class','ui_separator');
};

DataDisplay.prototype.newTinySeparator = function( context ){
	context.append('div').attr('class','ui_separator_tiny');
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