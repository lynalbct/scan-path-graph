Hasher = function hasher(){

};

Hasher.usr = function ( userName, password ){
	return CryptoJS.MD5(userName) + CryptoJS.MD5(password);
};

Hasher.img = function ( imgName ){
	return CryptoJS.MD5(imgName);
};

Hasher.dat = function ( imgName, fileName ){
	return CryptoJS.MD5(imgName) + CryptoJS.MD5(fileName);
};