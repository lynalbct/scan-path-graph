DataDisplay = function dataDisplay( imageName, imageExt ){
	// Strings
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
	// Animation & effect control
	this.animationInterval = null;
	this.popInterval = null;	// Interval for poping each circle
	this.colorScale = d3.scale.linear().range(['violet', 'blue','green','yellow','orange','red']).domain([0, 200, 400, 600, 800, 1000]);
	this.mCoord = [0, 0];	// Mouse coordinate
	// Frame control
	this.key = 0;
	// Data properties
	this.scaling = null;
	this.dataSize = 0;
	this.sampleRate = 0;
	this.rawData = [];
	this.fixationData = [];
	this.record = {'totalTime' : 0, 'lowTime' : 0, 'highTime' : 0};	// Keep track of time frame of the data set
	this.rawBackup = [];	// Backup for use with filters
	// Settings
	this.calcFix = false;	// If calculate fixation from data
	this.criteria = {'minTime' : 40, 'errX' : 5, 'errY' : 3};	// Calculation criteria
	// Event properties
		//this.isPaused = false;
	// Initialization
	this.init();
};

DataDisplay.prototype.init = function(){
	// Init
	this.loadImage();
};

// Communication

DataDisplay.prototype.loadImage = function(){
	this.newLoadingScreen( this.string.loadImage );
	var src = 'data/images/'+this.imageName+this.imageExt,
	self = this,
	img = $("<img />").attr('src', src).load(function() {
		if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
			console.log('Image broken');
		} else {
			// Initialize canvas dimension and load image
			self.imageWidth = this.width;
    		self.imageHeight = this.height;
    		self.canvas
				.style('background-image','url('+src+')');
			self.svg
				.style('width',self.imageWidth)
				.style('height',self.imageHeight);
			self.removeLoadingScreen();
			// Load data
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
	// Parse loaded PHP json
	for (i = 0; i < this.rawData.data.length; i++ ){
		d.push({
			// Coordinate
			'x': this.rawData.data[i][0],
			'y': this.rawData.data[i][1],
			// Start time; duration
			's': this.rawData.data[i][2],
			't': this.rawData.data[i][3]
		});
	}
	// Total time from the last data point
	this.record.totalTime = this.rawData.data[i-1][2] + this.rawData.data[i-1][3];
	this.sampleRate = this.rawData.sample_rate;
	this.scaling = this.rawData.scale;
	this.rawData = d;
	this.rawBackup = d;
	this.parseFix();
	this.removeLoadingScreen();
};

DataDisplay.prototype.parseFix = function(){
	var d = [], i = 0, idx = 0,
		// Range of fixation time; used for scaling radius
		maxR = Number.NEGATIVE_INFINITY, minR = Number.POSITIVE_INFINITY,
		// Dispersion scaling
		maxDisp = Number.NEGATIVE_INFINITY,
		fixation = {},
		radiusMin = 4, radiusMax = 40;
	if ( this.calcFix ){
		this.criteria.errX *= this.scaling.scaleX;
		this.criteria.errY *= this.scaling.scaleY;
		var c = this.rawData[i],	// First raw of the fixation
		rawArray = {	// Accumulation of raw points
			'x': [c.x], 'y': [c.y], 'start': c.s, 't': c.t
		};
		for (i = 0; i < this.rawData.length - 1; i++){
			if (	// If next point is within deviation bounds
				this.calcError( this.rawData[i+1].x, this.rawData[i].x, this.criteria.errX) &&
				this.calcError( this.rawData[i+1].y, this.rawData[i].y, this.criteria.errY) ){
				rawArray.x.push(this.rawData[i+1].x);
				rawArray.y.push(this.rawData[i+1].y);
				rawArray.t += this.rawData[i+1].t;
			} else {	// Calculate fixation from accumulation
				if (rawArray.t >= this.criteria.minTime ){
					idx++;
					fixation.x = this.calcAvg(rawArray.x);
					fixation.y = this.calcAvg(rawArray.y);
					fixation.ftime = rawArray.t;
					fixation.dispersion = this.calc2dDispersion(rawArray.x, rawArray.y);
					fixation.idx = idx;
					fixation.start = rawArray.start;	// Start time
					fixation.end = rawArray.start + rawArray.t;	// End time
					d.push(fixation);
					if (fixation.ftime > maxR){
						maxR = fixation.ftime;
					}
					if (fixation.ftime < minR){
						minR = fixation.ftime;
					}
					if (fixation.dispersion > maxDisp){
						maxDisp = fixation.dispersion;
					}
					fixation = {};
				}
				// Reset
				c = this.rawData[i];
				rawArray = {
					'x': [c.x], 'y': [c.y], 'start': c.s, 't': c.t
				};
			}
		}
	} else {
		for (i = 0; i < this.rawData.length; i++){
			if (this.rawData[i].t >= this.criteria.minTime ){
				idx++;
				fixation.x = this.rawData[i].x;
				fixation.y = this.rawData[i].y;
				fixation.ftime = this.rawData[i].t;
				fixation.dispersion = 0;
				fixation.idx = idx;
				fixation.start = this.rawData[i].s;
				fixation.end = fixation.start + this.rawData[i].t;
				d.push(fixation);
				if (fixation.ftime > maxR){
					maxR = fixation.ftime;
				}
				if (fixation.ftime < minR){
					minR = fixation.ftime;
				}
				if (fixation.dispersion > maxDisp){
					maxDisp = fixation.dispersion;
				}
				fixation = {};
			}
		}
	}
	for (i = 0; i < d.length; i++ ){
		// Scale radius on fixation time
		if (maxR == minR){
			d[i].r = radiusMax;
		} else {
			d[i].r = (d[i].ftime - minR) / (maxR - minR) * (radiusMax - radiusMin) + radiusMin;
		}
		// Scale dispersion
		if (maxDisp == 0){
			d[i].relativeDisp = 0;
		} else {
			d[i].relativeDisp = d[i].dispersion / maxDisp;
		}
	}
	// Update data properties
	this.record.lowTime = minR;
	this.record.highTime = maxR;
	this.dataSize = d.length;
	this.fixationData = d;
};

// Visualization elements

DataDisplay.prototype.newCircle = function( fixation ){
	var scale = fixation.idx / this.dataSize * 1000
		self = this;
		circle = this.svgCircle.append('circle');
		rect = this.canvas.append('div');
	// Animation effect
	var effect = function(){
		self.newEdgeWalk( fixation, scale );
		self.dimUnrelated( fixation.idx );
		self.animationInterval = setInterval(function(){
			self.newEdgeWalk( fixation, scale );
		}, 2000);
		self.canvas.select('#slidebar_key_'+fixation.idx)
			.style('background-color','rgba(0,0,0,0.8)');
		self.trigger('customMouseIn',self.canvas.select('#slidebar_key_'+fixation.idx).node());
	};
	circle.style('fill', this.colorScale(scale) )
		.attr({
			'cx': fixation.x,
			'cy': fixation.y,
			'stroke-width': 4,
			'stroke': this.colorScale(scale),
			'fill-opacity': 0.3,
			'r': 0})
		.transition().duration(300).attr('r', fixation.r );
	rect.attr({
		'class': 'circle_mouse_event_receiver',
		'id': 'circle_mouse_event_receiver_'+fixation.idx})
		.style({
			'position':'absolute',
			'left': fixation.x - fixation.r,
			'top': fixation.y - fixation.r,
			'width': fixation.r * 2,
			'height': fixation.r * 2});
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
	var scale = (from.idx + to.idx) / 2 / this.dataSize * 1000,
		p1 = this.calcCircleIntersect( from, to, to.r ),
		p2 = this.calcCircleIntersect( to, from, from.r ),
		x1 = p1.x, y1 = p1.y,
		x2 = p2.x, y2 = p2.y;
	this.svgEdge.append('line')
		.attr({
			'x1': x1, 'y1': y1,
			'x2': x2, 'y2': y2,
			'stroke-width': 0,
			'stroke': this.colorScale(scale)})
		.transition().duration(300).attr('stroke-width', 3);
};

DataDisplay.prototype.newInfo = function( p ){
	var panel = this.canvas.append('div').attr('class','vertical_layout').attr('id','infoPanel');
	if (p.idx === 1){
		this.newLabel('#'+p.idx+' S', panel);
	} else if (p.idx === this.dataSize){
		this.newLabel('#'+p.idx+' E', panel);
	} else {
		this.newLabel('#'+p.idx, panel)
	}
	this.newLabel('; Coord: ('+parseInt(p.x)+', '+parseInt(p.y)+')', panel);
	this.newLabel('; Duration: '+parseInt(p.ftime)+' ms', panel);
	if (p.dispersion !== 0){
		this.newLabel('; Spread: '+parseInt(p.dispersion), panel);
	} else {
		this.newLabel('; Spread: no spread', panel);
	}
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
				.style({'left': left, 'max-width': w});
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

DataDisplay.prototype.removeInfo = function(){
	this.canvas.select('#infoPanel').remove();
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
		.attr({
			'fill': this.colorScale(color),
			'r': 5,
			'cx': a.x, 'cy': a.y})
		.transition().duration(400)
			.attr({'cx': fixation.x, 'cy': fixation.y})
			.remove();
	}
	if (b !== null){
		c2 = this.svgEffect.append('circle')
		.attr({
			'fill': this.colorScale(color),
			'r': 5,
			'cx': fixation.x, 'cy': fixation.y})
		.transition().duration(400)
			.attr({'cx': b.x, 'cy': b.y})
			.remove();
	}
};

DataDisplay.prototype.decorateCircle = function( fixation, isStart ){
	var scale = fixation.idx / this.dataSize * 500
		self = this;
		circle = this.svgHighlight.append('circle');
	circle.style('fill', 'transparent' )
		.attr({
			'cx': fixation.x, 'cy': fixation.y,
			'stroke-width': 4,
			'stroke': 'black',
			'stroke-dasharray': '5,5',
			'r': 0})
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
		if (this.key === this.dataSize || this.key === 0){
			this.svgHighlight.selectAll('circle').filter(':last-child').remove();
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

/*
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
*/

DataDisplay.prototype.replay = function(){
	this.clear();
	this.display();
};

DataDisplay.prototype.clear = function(){
	this.canvas.selectAll('.circle_mouse_event_receiver').remove();
	this.canvas.select('#slidebar').selectAll('.slidebar_key').remove();
	this.svgCircle.selectAll('circle').remove();
	this.svgEdge.selectAll('line').remove();
	this.svgHighlight.selectAll('circle').remove();
}

DataDisplay.prototype.refreshOnCriteriaChange = function(){
	this.newLoadingScreen( this.string.parseData );
	// Reparse raw data
	this.parseFix();
	this.removeLoadingScreen();
	// Refresh
	this.replay();
};

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
		scaleS = fixation.start / this.record.totalTime,
		scaleE = fixation.end / this.record.totalTime,
		l = scaleS * totalW,
		w = (scaleE - scaleS) * totalW,
		self = this,
		rect = self.canvas.select('#circle_mouse_event_receiver_'+fixation.idx).node(),
		key = slidebar.append('div')
			.attr({
				'class': 'slidebar_key',
				'id': 'slidebar_key_'+fixation.idx})
			.style({'left': l, 'width': w});
	key.style( 'height', parseInt(key.style('height')) * (1.1 + fixation.relativeDisp) );
	key.on('mouseenter', function(){
			self.trigger('mousefocus', rect);
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

	//Playback
	this.newButton('stepbackButton','Step backward', playback);
	this.newButton('playButton','Play', playback);
	this.newButton('stepforButton','Step forward', playback);
	this.newSeparator( playback );

	//Settings
	this.newButton('settingsDropdown','Settings', settings);
	this.newSeparator( settings );
	var settingsDropdown = settings.append('div').attr('class','listPanel')
		.style({'left': 0, 'top': panel.style('height'), 'display': 'none'});
	settingsDropdown.on('mouseleave', function(){ d3.select(this).style('display','none'); });
	settings.select('#settingsDropdown').on('click', function(){
		settingsDropdown.style('display') === 'none' ?
			settingsDropdown.style('display','block') : settingsDropdown.style('display','none');
	});

	//Settings menu
	var paramLayout = settingsDropdown.append('div').attr('class','vertical_layout');
	//Fixation checkbox
	var t1 = paramLayout.append('div').attr('class','vertical_layout_clear'), t2;
	this.newBox('calcFixation', t1, this.calcFix);
	this.newLabel('Calculate fixations', t1);

	//Fixation settings
	this.newSeparatorHorizontal( paramLayout );
	this.newLabel('Fixation settings: ', paramLayout.append('div').attr('class','vertical_layout_clear'));
		//Dev V
	this.newLabel('Deviation V (px): ', paramLayout.append('div').attr('class','vertical_layout_clear'));
	this.newInput('devVInput', paramLayout.append('div').attr('class','vertical_layout_clear'), this.criteria.errY);
		//Dev H
	this.newLabel('Deviation H (px): ', paramLayout.append('div').attr('class','vertical_layout_clear'));
	this.newInput('devHInput', paramLayout.append('div').attr('class','vertical_layout_clear'), this.criteria.errX);
		//Threshold
	this.newLabel('Threshold (ms): ', paramLayout.append('div').attr('class','vertical_layout_clear'));
	this.newInput('thresholdInput', paramLayout.append('div').attr('class','vertical_layout_clear'), this.criteria.minTime);

	//Filter
	this.newSeparatorHorizontal( paramLayout );
	this.newLabel('Filter: ', paramLayout.append('div').attr('class','vertical_layout_clear'));
		//All
	t1 = paramLayout.append('div').attr('class','vertical_layout_clear');
	this.newRadio('filterAll', t1, true);
	this.newLabel('All data', t1);
		//Filter by time range
	t1 = paramLayout.append('div').attr('class','vertical_layout_clear');
	t2 = paramLayout.append('div').attr('class','vertical_layout_clear');
	this.newRadio('filterTime', t1);
	this.newLabel('Time range (ms): ', t1);
	this.newInput('filterTime_s', t2, 0);
	this.newLabel(' - ', t2);
	this.newInput('filterTime_e', t2, this.record.totalTime);
		//Filter by data point order
	t1 = paramLayout.append('div').attr('class','vertical_layout_clear');
	t2 = paramLayout.append('div').attr('class','vertical_layout_clear');
	this.newRadio('filterNum', t1);
	this.newLabel('Data point #: ', t1);
	this.newInput('filterNum_s', t2, 1);
	this.newLabel(' - ', t2);
	this.newInput('filterNum_e', t2, this.dataSize);
		//Filter by data point duration
	t1 = paramLayout.append('div').attr('class','vertical_layout_clear');
	t2 = paramLayout.append('div').attr('class','vertical_layout_clear');
	this.newRadio('filterDuration', t1);
	this.newLabel('Duration (ms): ', t1);
	this.newInput('filterDura_s', t2, Math.floor(this.record.lowTime));
	this.newLabel(' - ', t2);
	this.newInput('filterDura_e', t2, Math.ceil(this.record.highTime));

	//Buttons
	this.newSeparatorHorizontal( paramLayout );
	this.newButton('exportButton', 'Save plot to image file', paramLayout );
	this.newButton('updateButton', 'Update', paramLayout );
	paramLayout.select('#updateButton').style({'float': 'right', 'margin-bottom': '0.75em'});

	//Event handlers
	var self = this;
	playback.select('#stepforButton').on('click', function(){
		self.stepForward();
	});
	playback.select('#stepbackButton').on('click', function(){
		self.stepBackward();
	});
	playback.select('#playButton').on('click', function(){
		self.replay();
	});
	paramLayout.select('#updateButton').on('click', function(){
		//If calculate fixation
		self.calcFix = paramLayout.select('#calcFixation').property('checked');
		//Update calculation settings
		if (self.calcFix){
			self.criteria.errY = parseFloat(paramLayout.select('#devVInput').property('value'));
			self.criteria.errX = parseFloat(paramLayout.select('#devHInput').property('value'));
			self.criteria.minTime = parseFloat(paramLayout.select('#thresholdInput').property('value'));
		}
		//Data filter
		var c = paramLayout.select('input[name=choices]:checked').attr('id');
		self.rawData = self.rawBackup;
		var d = [];
		for (i = 0; i < self.rawData.length; i++){
			if (self.rawData[i].t >= self.criteria.minTime ){
				d.push(self.rawData[i]);
			}
		}
		switch(c){
			case 'filterAll':
				self.rawData = self.rawBackup;
				break;
			case 'filterTime':
				var tLow = parseFloat(paramLayout.select('#filterTime_s').property('value')),
					tHigh = parseFloat(paramLayout.select('#filterTime_e').property('value')),
					newData = [];
				for (var i = 0; i < d.length; i++){
					if (d[i].s >= tLow && d[i].s + d[i].t <= tHigh){
						newData.push(d[i]);
					}
				}
				self.rawData = newData;
				break;
			case 'filterNum':
				var nLow = parseInt(paramLayout.select('#filterNum_s').property('value')),
					nHigh = parseInt(paramLayout.select('#filterNum_e').property('value')),
					newData = [];
				for (var i = 0; i < d.length; i++){
					if ( i + 1 >= nLow && i + 1 <= nHigh){
						newData.push(d[i]);
					}
				}
				self.rawData = newData;
				break;
			case 'filterDuration':
				var dLow = parseFloat(paramLayout.select('#filterDura_s').property('value')),
					dHigh = parseFloat(paramLayout.select('#filterDura_e').property('value')),
					newData = [];
				for (var i = 0; i < d.length; i++){
					if (d[i].t >= dLow && d[i].t <= dHigh){
						newData.push(d[i]);
					}
				}
				self.rawData = newData;
				break;
		}
		self.refreshOnCriteriaChange();
	});
	paramLayout.select('#exportButton').on('click', function () {
		//Convert svg to canvas
		var c = self.canvas.append('canvas').attr('id','exportCanvas').style('height',self.imageHeight).style('width',self.imageWidth);
		//CLean up leading, trailing spaces to prevent 'html' error
		//Clean up html entities to prevent 'parsererror' error
		var svgHtml = self.svg.node().parentNode.innerHTML.replace(/>\s+/g, '>').replace(/\s+</g, '<').replace(/<canvas.+/g,'').replace(/<div.+/g,'');
		canvg(document.getElementById('exportCanvas'), svgHtml);
		//Convert canvas to png
		var cv = document.getElementById('exportCanvas');
		var img = cv.toDataURL('image/png');
		//Show result
		var exportResult = self.canvas.append('div').attr('class','listPanel');
		self.newLabel('Right click on the image to save:', exportResult.append('div').attr('class','vertical_layout_clear'));
		exportResult.append('div').attr('class','vertical_layout_clear')
			.append('img').attr('src',img).style({
				'border': '1px solid #CCC',
				'width': '640px',
				'height': img.height / img.width * 640});
		exportResult.style({
			'top': self.calcScreenCenterV() - parseInt(exportResult.style('height')) / 2,
			'left': self.calcScreenCenterH() - parseInt(exportResult.style('width')) / 2 });
		self.newButton('exportResultOk', 'Close', exportResult.append('div').attr('class','vertical_layout_clear') );
		exportResult.select('#exportResultOk').style({'float': 'right', 'margin-bottom': '0.75em'});
		exportResult.select('#exportResultOk').on('click', function(){ exportResult.remove() });
		c.remove();
	});

	this.canvas.style('margin-top',panel.style('height'));
};

DataDisplay.prototype.newButton = function( id, hint, context ){
	context.append('a').attr('id',id).attr({'title': hint, 'class': 'ui_button'});
};

DataDisplay.prototype.newInput = function( id, context, defaultValue ){
	context.append('input')
		.attr({'id': id, 'class': 'ui_input', 'placeholder': defaultValue}).property('value',defaultValue)
		.style('margin','auto 0.25em');
};

DataDisplay.prototype.newLabel = function( label, context ){
	context.append('div').attr('class','ui_input_label').style('margin-left','0.25em').text(label);
};

DataDisplay.prototype.newRadio = function( id, context, checked ){
	context.append('input')
		.attr({
			'type': 'radio',
			'id': id,
			'name': 'choices'})
		.property('checked', checked);
};

DataDisplay.prototype.newBox = function( id, context, checked ){
	context.append('input')
		.attr({
			'type': 'checkbox',
			'id': id,
			'name': 'properties'})
		.property('checked', checked);
};

DataDisplay.prototype.newSeparator = function( context ){
	context.append('div').attr('class','ui_separator');
};

DataDisplay.prototype.newSeparatorHorizontal = function( context ){
	context.append('div').attr('class','ui_separator_hor');
};

DataDisplay.prototype.newPanel = function( id ){
	var panel = this.canvas.append('div').attr({'class': 'panel', 'id': id});
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

// Helper methods

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
	// Calculate intersection of circle and line segment
	var a = pCircle.y - pOutside.y,
		b = pCircle.x - pOutside.x,
		c = Math.sqrt(a * a + b * b),
		cos = a / c, sin = b / c,
		c2 = r,
		a2 = r * cos, b2 = r * sin,
		y = pCircle.y - a2,
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
	return pos = window.innerHeight / 2;
};

DataDisplay.prototype.calcScreenCenterH = function(){
	return pos = window.innerWidth / 2;
};

// Property accessors

DataDisplay.prototype.getFixationCriteria = function(){
	return this.criteria;
};