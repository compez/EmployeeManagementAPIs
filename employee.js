var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var EmployeeSchema = new Schema({
	//avatarPath: String,
	id: String,
	name: String,
	sex: String,
	startDate: String,
	officePhone: String,
	cellPhone: String,
	email: String,
	managerId: String,
	managerName: String,
	dr: [],
}, { minimize: false });

module.exports = mongoose.model('Employee', EmployeeSchema);