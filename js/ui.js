UI = function ui(){};

UI.newButton = function( id, hint, context ){
	context.append('a').attr('id',id).attr({'title': hint, 'class': 'ui_button'});
};

UI.newTabButton = function( id, hint, context ){
	context.append('a').attr('id',id).attr({'title': hint, 'class': 'ui_tabButton'});
};

UI.newTextButton = function( id, hint, context ){
	context.append('a').attr('id',id).attr({'class': 'ui_textButton'}).text(hint);
};

UI.newInput = function( id, context, defaultValue ){
	context.append('input')
		.attr({'id': id, 'class': 'ui_input', 'placeholder': defaultValue}).property('value',defaultValue)
		.style('margin','auto 0.25em');
};

UI.newLongInput = function( id, context, defaultValue ){
	context.append('input')
		.attr({'id': id, 'class': 'ui_longInput', 'placeholder': defaultValue})
		.style('margin','auto 0.25em');
};

UI.newLabel = function( label, context, float ){
	var l = context.append('div').attr('class','ui_input_label').style('margin-left','0.25em').text(label);
	if (float){l.style('float','left')}
};

UI.newRadio = function( id, context, checked ){
	context.append('input')
		.attr({
			'type': 'radio',
			'id': id,
			'name': 'choices'})
		.property('checked', checked);
};

UI.newBox = function( id, context, checked ){
	context.append('input')
		.attr({
			'type': 'checkbox',
			'id': id,
			'name': 'properties'})
		.property('checked', checked);
};

UI.newSeparator = function( context ){
	context.append('div').attr('class','ui_separator');
};

UI.newSeparatorHorizontal = function( context ){
	context.append('div').attr('class','ui_separator_hor');
};

UI.newPanel = function( id, context ){
	var panel = context.append('div').attr({'class': 'panel', 'id': id});
	return panel;
};

UI.removePanel = function( id, context ){
	context.select('#'+id).remove();
};

UI.newColumn = function( id, context ){
	context.append('div').attr({'id':id, 'class':'column_layout'});
}

UI.newFileUpload = function( id, context, multiple, callback ){
	var form = context.append('form').attr({
		'method': 'post',
		'enctype': 'multipart/form-data'
	}).style('float','left');
	var inpt = form.append('input').attr({
		'type':'file',
		'name':id,
		'id':id
	});
	if (multiple){
		inpt.attr('multiple','');
		form.append('ul').style({'overflow-y':'auto', 'overflow-x':'hidden', 'width':'16em', 'height':'16em', 'position':'relative'});
		inpt.on('change', function (evt) {
			var i = 0, len = this.files.length, img, reader, file;
			form.select('ul').selectAll('li').remove();
			for ( var i = 0; i < this.files.length; i++ ) {
				file = this.files[i];
				form.select('ul').append('li').text(file.name);
			}
		});
	}
};