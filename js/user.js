LoginDisplay = function loginDisplay(){
	this.canvas = d3.select('#user');
};

LoginDisplay.prototype.gate = function(){
	var panel = this.canvas.append('div').attr('class','listPanel');
		UI.newLabel('Login:', panel.append('div').attr('class','vertical_layout_clear'));
		UI.newLongInput('usrName', panel.append('div').attr('class','vertical_layout_clear'), 'User name');
		UI.newLongInput('pswd', panel.append('div').attr('class','vertical_layout_clear'), 'Password');
		UI.newTextButton('loginButton', 'Login', panel.append('div').attr('class','vertical_layout_clear') );
		UI.newSeparatorHorizontal(panel.append('div').attr('class','vertical_layout_clear'));
		UI.newLabel('Leave above fields blank to access demo account.', panel.append('div').attr('class','vertical_layout'));
		panel.style({
			'top': window.innerHeight / 2 - parseInt(panel.style('height')) / 2,
			'left': window.innerWidth / 2 - parseInt(panel.style('width')) / 2 });
		panel.select('#loginButton').style({'float': 'right', 'margin-bottom': '0.75em'}).on('click',function(){
			var u = panel.select('#usrName').property('value'),
				p = panel.select('#pswd').property('value');
			var k = new UserDisplay(u, p);
			panel.remove();
		});
};

UserDisplay = function userDisplay(userName, password){
	this.canvas = d3.select('#user');
	this.user = userName;
	this.userHash = Hasher.usr(userName, password);
	this.tree = {};
	this.treeSize = 0;
	this.init();
	this.plot = null;
};

UserDisplay.prototype.init = function(){
	/*
		{
			'imgHash':{
				'imgName':'str'
				'data': [
					{'dataHash1':'dataName'},
					{'dataHash2':'dataName'},
					...
				]
			},
			'imgHash':{
				'imgName':'str'
				'data': [
					{'dataHash1':'dataName'},
					{'dataHash2':'dataName'},
					...
				]
			},
			...
		}
	*/
	// PHP connector
	var self = this;
	$.ajax({
		url: './php/db.php?a=r&u='+this.userHash,
		dataType: 'json',
		success: function( data ){
			self.tree = data;
			for (var key in self.tree) {
				if (self.tree.hasOwnProperty(key)) self.treeSize++;
			}
			self.initUI();
			UI.newTabButton('userButton', 'Your data', self.canvas);
			self.canvas.select('#userButton').on('click', function(){
				if (self.canvas.select('#userUI').empty()){
					self.initUI();
				} else {
					self.canvas.select('#userUI').remove();
				}
			});
		},
		error: function(xhr, ts, et){
			console.log(xhr);
		}
	});
};

UserDisplay.prototype.initUI = function(){
	var panel = this.canvas.append('div').attr({'id':'userUI', 'class':'listPanel'});
	var t1 = panel.append('div').attr('class','vertical_layout').style('height','2em');
	// Header
	UI.newLabel('Welcome, '+this.user, t1);
	UI.newButton('logoutButton', 'Logout', t1);
	UI.newButton('xButton', 'Close', t1);
	// Folder tree
	t1 = panel.append('div').attr('class','vertical_layout');
	UI.newColumn('imgCol', t1);
	UI.newColumn('dataCol', t1);
	UI.newColumn('uploadCol', t1);

	var imgCol = panel.select('#imgCol').append('div').attr('class','vertical_layout'),
	dataCol = panel.select('#dataCol').append('div').attr('class','vertical_layout'),
	uploadCol = panel.select('#uploadCol'),
	self = this;

	for (var key in this.tree){
		this.newItem( key, this.tree[key].imgName, imgCol );
	}

	UI.newLabel('Each file should be less than 2MB in size.', uploadCol.append('div').attr('class','vertical_layout'), true);
	UI.newLabel('Upload a new image:', uploadCol.append('div').attr('class','vertical_layout'), true);
	UI.newFileUpload('singleImg', uploadCol.append('div').attr('class','vertical_layout'), false, this.uploadImg);
	UI.newLabel('Upload data for the image (*.tbs, 19 max):', uploadCol.append('div').attr('class','vertical_layout'), true);
	UI.newFileUpload('dataFiles', uploadCol.append('div').attr('class','vertical_layout'), true, this.uploadData);
	UI.newTextButton('submitBtn', 'Upload', uploadCol.append('div').attr('class','vertical_layout'));
	uploadCol.select('#submitBtn').on('click', function(){
		self.upload();
	});

	panel.select('#imgCol').style({'border-right':'1px solid rgba(0,0,0,0.2)'});
	panel.select('#uploadCol').style({'background-color':'rgba(0,0,0,0.2)'});
	panel.select('#xButton').style({'float': 'right', 'margin-bottom': '0.75em'});
	panel.select('#xButton').on('click', function(){ panel.remove() });
	panel.select('#logoutButton').on('click', function(){
		if (confirm('Are you sure you want to logout?')) {
			window.location.reload();
		}
	});
	panel.style({
		'top': window.innerHeight / 2 - parseInt(panel.style('height')) / 2,
		'left': window.innerWidth / 2 - parseInt(panel.style('width')) / 2
	});
};

UserDisplay.prototype.newItem = function( hashKey, name, context ){
	var item = context.append('div').attr({
		'id': hashKey,
		'class': 'ui_listItem'
	}).text(name);
	var self = this;
	var ext = name.match(/.+(\.[^\.]+)$/)[1];
	item.on('click',function(){
		d3.select(this.parentNode).selectAll('div').attr('class','ui_listItem');
		d3.select(this).attr('class','ui_listItem ui_listItem_selected');
		self.newDataItem(hashKey, ext);
	});
};

UserDisplay.prototype.newDataItem = function( hashKey, imgExt ){
	var col = this.canvas.select('#userUI').select('#dataCol').select('.vertical_layout');
	col.selectAll('.ui_listItem').remove();
	for (var i = 0; i < this.tree[hashKey].data.length; i++){
		for (var key in this.tree[hashKey].data[i]){
			var item = col.append('div').attr({
				'id': key,
				'class': 'ui_listItem'
			}).text(this.tree[hashKey].data[i][key]);
			var self = this;
			item.on('click',function(){
				self.load( hashKey + imgExt , key, self.userHash );
			});
		}
	}
};

UserDisplay.prototype.load = function( img, dat, usr ){
	if (this.plot){
		this.plot.destroy();
		this.plot = null;
	}
	this.canvas.select('#userUI').remove();
	this.plot = new DataDisplay( img, dat, usr );
};

UserDisplay.prototype.upload = function(){
	var input = document.getElementById('singleImg'),
		formdata = false, self = this;
	if (window.FormData) {
		formdata = new FormData();
	}
	var i = 0, len = input.files.length, img, reader, file;
	if (len !== 0){
		this.canvas.select('#userUI').select('#uploadCol').select('#submitBtn').text('Uploading...');
		file = input.files[0];
		if (file.type.match('image.*')) {
			if ( window.FileReader ) {
				reader = new FileReader();
				reader.readAsDataURL(file);
			}
			if (formdata) {
				formdata.append('image[]', file);
			}
		}
		if (formdata) {
			$.ajax({
				url: './php/upload.php?a=img&u='+this.userHash,
				type: 'POST',
				data: formdata,
				processData: false,
				contentType: false,
				success: function (res) {
					self.tree[Hasher.img( file.name )] = {
						'imgName':file.name,
						'data': []
					};
					self.uploadData( file.name );
				}
			});
		}
    }
};

UserDisplay.prototype.uploadData = function( imgName ){
	var input = document.getElementById('dataFiles'),
		formdata = false, queue = [], self = this;
	if (window.FormData) {
		formdata = new FormData();
	}
	var i = 0, len = input.files.length, img, reader, file;
	if (len !== 0){
		for (i; i < len; i++){
			file = input.files[i];
			if (file.name.match('\.tbs')) {
				if ( window.FileReader ) {
					reader = new FileReader();
					reader.readAsDataURL(file);
				}
				if (formdata) {
					formdata.append('data[]', file);
				}
			}
			if (formdata) {
				$.ajax({
					url: './php/upload.php?a=data&u='+this.userHash+'&i='+imgName,
					type: 'POST',
					data: formdata,
					processData: false,
					contentType: false,
					success: function (res) {
						for (i = 0; i < len; i++){
							file = input.files[i];
							var o = {};
							o[Hasher.dat( imgName, file.name )] = file.name;
							self.tree[Hasher.img( imgName )].data.push(o);
						}
						self.canvas.select('#userUI').select('#uploadCol').select('#submitBtn')
							.text('Success!')
							.transition().delay(1000)
							.text('Upload');
						$.ajax({
							url: 'db.php?a=w&u='+self.userHash,
							type: 'POST',
							data: {'record': self.tree},
							dataType: 'json',
							success: function (res) {
								self.canvas.select('#userUI').remove();
								self.init();
							},
							error: function(xhr, ts, et){
								console.log(xhr);
							}
						});
					}
				});
			}
		}
    }
};