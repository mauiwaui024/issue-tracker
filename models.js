const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const issueSchema = new mongoose.Schema({
  title: {type: String},
  text: {type: String},
  created_by : {type: String},
  assigned_to : String,
  open: Boolean,
  created_on: {type: Date, required: true},
  updated_on: {type: Date, required: true},
});

const Issue = mongoose.model("Issue", issueSchema);

const projectSchema = new mongoose.Schema({
  name: String,
  issues: [issueSchema]
});

const Project = mongoose.model("Project", projectSchema)

////////////
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
userSchema.plugin(passportLocalMongoose)
const User = mongoose.model("User", userSchema)
/////////
exports.Issue = Issue;
exports.Project = Project;
exports.User = User;
