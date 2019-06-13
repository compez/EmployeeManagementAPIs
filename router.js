var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var multer = require('multer');
var storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, './avatar_store')
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + "." + "jpg")
	}
});
var upload = multer({ storage: storage });
var Employee = require('./employee');
var fs = require('fs');

var uri = 'mongodb+srv://userListAd:simplelikethat@cluster0-ooemg.mongodb.net/test?retryWrites=true';
mongoose.connect(uri, { useNewUrlParser: true });
// { dbName: 'test' }

router.use((req, res, next) => {
	console.log("someone is approaching Employee API");
	console.log('URL: ' + req.url);
	next();
});

router.get('/', (req, res) => {
	res.json({ message: "Employee API is Ready" });
});

router.get('/employees-namelist', (req, res) => {
	Employee.find({}, { name: 1 }).sort({ name: 1 }).exec((err, list) => {
		if (err) {
			res.send(err);
		}
		console.log(list);
		res.json(list);
	});
});

router.route('/employees')
	.post(upload.array('image', 1), (req, res) => {
		console.log(req.files);
		let employee = new Employee();
		createOrUpdate(req, employee);
		console.log(JSON.stringify(employee));
		employee.save((err, newEmployee) => {
			if (err) {
				res.send(err);
				return;
			}
			new Promise(async (resolve, reject) => {
				newEmployee.id = newEmployee._id.toString();
				if (newEmployee.managerId) {
					console.log("flag1");
					await addMyManager(newEmployee.managerId, newEmployee.id, Employee, res);
				}
				fs.rename('./avatar_store/image.jpg', './avatar_store/' + newEmployee.id + '.jpg'
					, (err) => {
						if (err) {
							console.log(err);
							fs.copyFile('./avatar_store/default.jpg', './avatar_store/' + newEmployee.id + '.jpg'
								, (err) => {
									if (err) console.log(err);
								})
						}
					})
				employee.save();
				resolve();
			})
				.then(() => {
					res.json({ message: "Employee " + employee.name + " was created" });
				});
		});
	})
	.get((req, res) => {
		let sortPlan = JSON.parse(req.query.sortPlan);
		let searchString = req.query.searchString;
		let page = req.query.page;
		// console.log(sortPlan);c
		// console.log(typeof sortPlan);
		// change back
		filterPlan = {
			$or: [
				{ 'name': { '$regex': searchString, '$options': 'i' } },
				{ 'sex': { '$regex': searchString, '$options': 'i' } },
				{ 'startDate': { '$regex': searchString, '$options': 'i' } },
				{ 'officePhone': { '$regex': searchString, '$options': 'i' } },
				{ 'cellPhone': { '$regex': searchString, '$options': 'i' } },
				{ 'managerName': { '$regex': searchString, '$options': 'i' } },
				{ 'email': { '$regex': searchString, '$options': 'i' } },
			]
		};
		Employee.find(filterPlan)
			.sort(sortPlan)
			.limit(page * 15)
			.exec((err, employees) => {
				if (err) {
					res.send(err);
					return;
				}
				res.json(employees);
			})
	});

router.get('/dr', (req, res) => {
	Employee.find({ _id: { $in: req.query.dr } }, (err, employees) => {
		if (err) {
			res.send(err);
			return;
		}
		console.log(employees);
		res.json(employees);
	})
});

router.get('/manager', (req, res) => {
	Employee.find({ _id: req.query.id }, (err, manager) => {
		if (err) {
			res.send(err);
			return;
		}
		res.json(manager);
	})
});

router.get('/valid-managers', (req, res) => {
	let mId = mongoose.Types.ObjectId(req.query.mId);
	console.log(JSON.stringify(mId));
	Employee.aggregate([
		{ $match: { _id: mId } },
		{
			$graphLookup: {
				from: "employees",
				startWith: "$id",
				connectFromField: "id",
				connectToField: "managerId",
				as: "chain"
			}
		},
		{
			$project: {
				crewIds: "$chain.id"
			}
		}
	], (err, result) => {
		if (err) {
			res.send(err);
			return;
		}
		result[0].crewIds.push(mId);
		Employee.find({ _id: { $nin: result[0].crewIds } }, { name: 1 }).sort({ name: 1 }).exec((err, list) => {
			if (err) {
				res.send(err);
			}
			console.log(list);
			res.json(list);
		});
	});
});

router.route('/employees/:employee_id')
	.put(upload.array('image', 1), async (req, res) => {
		// console.log("params: " + JSON.stringify(req.params));
		// console.log("body: " + JSON.stringify(req.body));
		// console.log("br type: " + typeof req.body.dr);
		if (req.body.managerId === "null") req.body.managerId = null;
		if (req.body.managerName === "null") req.body.managerName = null;
		Employee.findById(req.params.employee_id, (err, employee) => {
			console.log(employee);
			if (err) {
				res.send(err);
				return;
			}
			if (!employee) {
				res.json({ message: "No Such Employee" });
				return;
			}

			new Promise(async (resolve, reject) => {
				if (employee.managerId || req.body.managerId) {
					if (employee.managerId !== req.body.managerId) {
						console.log("SUPEURPEURER -1")
						console.log(employee.managerId);
						console.log(typeof employee.managerId);
						console.log(req.body.managerId);
						console.log(typeof req.body.managerId);
						if (employee.managerId) {
							await deleteMyManager(employee.id, employee.managerId, Employee, res);
						}
						if (req.body.managerId) {
							await addMyManager(req.body.managerId, employee._id.toString(), Employee, res)
						}
					}
				}
				// console.log("supererrerer");
				if (employee.name !== req.body.name && employee.dr) {
					await Employee.update({ _id: { $in: employee.dr } },
					{
						$set: {
							managerName: req.body.name,
						}
					}, {
						multi: true
					},
					err => {
						if (err) console.log(err);
					});
				}
				resolve();
			})
				.then(async () => {
					createOrUpdate(req, employee);
					await employee.save((err) => {
						if (err) {
							res.send(err);
							return;
						}
						if (req.file) {
							fs.rename('./avatar_store/image.jpg', './avatar_store/' + employee.id + '.jpg'
								, (err) => {
									if (err) {
										console.log(err);
									}
								})
						}
						res.json({ message: "Employee " + employee.name + " was updated" })
					});
				})
				.catch(err => {
					if (err) console.log(err);
				});
		})
	})
	//put, post, patch request have body.
	//if manager change, need do the same thing as delete.
	//delete from its manager's dr.
	//add it into new manager's dr.
	//update itself
	.delete((req, res) => {
		console.log("delete: " + (JSON.stringify(req.body)));
		let eId = req.body.id;
		let mId = req.body.managerId;
		let mName = req.body.managerName;
		let dr = req.body.dr;
		fs.unlink('./avatar_store/' + eId + '.jpg', err => {
			if (err) console.log(err);
		});
		console.log(mId);
		console.log(typeof mId);
		console.log(dr);
		//pass by query?
		//url params like /user/:id.
		//req.query is used to read query parameters like /user?id=123
		new Promise(async (resolve, reject) => {
			if (mId) {
				await deleteMyManagerAttachDr(eId, mId, dr, Employee, res);
			}
			//delete it from its manager's dr
			console.log("dr: " + !!dr);
			if (dr) {
				await Employee.update({ _id: { $in: dr } },
					{
						$set: {
							managerName: mName,
							managerId: mId
						}
					}, {
						multi: true
					},
					err => {
						if (err) console.log(err);
					})
			}
			resolve();
		}).then(async () => {
			console.log("I'am deleting")
			await Employee.deleteOne({
				_id: eId
			}, (err, employee) => {
				if (err) {
					res.send(err);
					return;
				}
				res.json({ message: "employee has been deleted" });
			});
		})
		//delete its dr's manager(itself)
		//pass 3 params
	});
//delete its dr's manager, done
//delete from it's manager dr, done
//delete itself, done

var addMyManager = async (mId, eId, Employee, res) => {
	await Employee.findById(mId, async (err, manager) => {
		if (err) {
			res.send(err);
			return;
		}
		if (!manager.dr) manager.dr = [];
		manager.dr.push(eId);
		await manager.save((err) => {
			if (err) {
				res.send(err);
				return;
			}
		});
	});
}

var deleteMyManager = async (eId, mId, Employee, res) => {
	await Employee.findByIdAndUpdate(mId, { $pull: { dr: { $in: eId } } }, (err, manager) => {
		console.log(err);
		if (err) {
			res.send(err);
			return;
		}

		// console.log(JSON.stringify(manager));
		// console.log("delete from manager dr list");
		// console.log(JSON.stringify(manager));
		// manager.save((err) => {
		// 	if (err) {
		// 		res.send(err);
		// 		return;
		// 	}
		// });
		// why does't it override (object)
	});
}

var deleteMyManagerAttachDr = async (eId, mId, dr, Employee, res) => {

	await Employee.findByIdAndUpdate(mId,
		{
			$pull: { dr: { $in: eId } },
		},
		async (err, manager) => {
			console.log(err);
			if (err) {
				res.send(err);
				throw err;
			}
			if (dr === null) return;
			await Employee.findByIdAndUpdate(mId,
				{
					$addToSet: { dr: { $each: dr } }
				},
				(err, manager) => {
					if (err) {
						res.send(err);
						throw err;
					}
				});
		});
}

var createOrUpdate = (req, employee) => {
	var body = req.body;
	employee.name = body.name;
	employee.sex = body.sex;
	employee.startDate = body.startDate;
	employee.officePhone = body.officePhone;
	employee.cellPhone = body.cellPhone;
	employee.email = body.email;
	employee.managerId = body.managerId;
	employee.managerName = body.managerName;
}


module.exports = router;