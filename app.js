const express = require("express");
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const _ = require('lodash');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const Issue = require(__dirname + "/models").Issue;
const Project = require(__dirname + "/models").Project;
const User = require(__dirname + "/models").User;

const app = express();
const { check, validationResult } = require('express-validator')

app.use(session({
  secret: "A very long long string.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/issuesDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"));
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const d = new Date;
const date = moment(d).format('lll');

console.log(date);

app.route("/issues/:projectName")
.post([
  check("title", "You forgot to enter issue title")
  .exists()
  .isLength({ min: 1 }),
  check("text", "You forgot to enter issue text")
  .exists()
  .isLength({ min: 1 }),
  check("created_by", "You forgot to enter your name")
  .exists()
  .isLength({ min: 1 }),
  check("assigned_to", "You forgot to enter to whom this issue is assigned_to")
  .exists()
  .isLength({ min: 1 }),
],function(req, res){

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({ errors: errors.array() });
  } else{
    const newIssue = new Issue({
      title: req.body.title,
      text: req.body.text,
      created_by: req.body.created_by,
      assigned_to: req.body.assigned_to,
      open: true,
      created_on: new Date(),
      updated_on: new Date()
    })
    //мы не сохраняем issue в отдельную коллекцию, а просто пушим его в соответствующий проект
    const addProj = _.capitalize(req.params.projectName);
     Project.findOne({name: addProj }, function(err, foundProject){
       if(!foundProject){
         const newProject = new Project({
           name: addProj})
           newProject.save()
           newProject.issues.push(newIssue)
           res.redirect("/issues/" + addProj)
           //some ejs file
       } else if(foundProject){
         foundProject.issues.push(newIssue)
         foundProject.save()
         //some ejs file
         res.redirect("/issues/" + addProj)
       }
     })
   };



})
/////////////////////////////GET ALL ISSUES CONNECTED TO THIS PROJECT//////////////////////
.get(function(req, res){
  if(req.isAuthenticated()){
    const projectName = req.params.projectName;
    Project.aggregate([
      {$match: {name: projectName}},
      {$unwind: "$issues"}
    ]).exec(function(err, foundProject){
    if(!err){
        let mappedProj = foundProject.map(function(item){
        return item.issues
        })
        res.render("project", {project: mappedProj, projectName: projectName, path: req.params.projectName})
        // res.send(mappedProj);
       //some ejs file
      }
    })

  } else{
    res.redirect("/login")
  }
})

  //////////////////////////////////////////DELETE WITH FORM//////////////////////////////
// app.post("/issues/:projectName/delwithform",function(req, res){
//   Project.findOne({name: req.params.projectName}, function(err, foundProject){
//      if(err){
//       console.log(err);
//     } else if(foundProject && !err){
//         const projData = foundProject.issues.id(req.body._id)
//         if(projData == null){
//           res.json({error:"Check if ID you entered is correct"})
//         } else{
//           const projSpecifId = projData._id
//           projIssueId.remove()
//           foundProject.save(function(err){
//             if(!err){
//               res.redirect("/issues/" + req.params.projectName)
//             } else{
//               console.log(err);
//             }
//           })
//
//         }
//
//       }
//   })
// } )

///////////////////////////////DELETE WITH BUTTON////////////////////////////////////////
app.post("/issues/:projectName/delete", function(req, res){
      const projectName = req.params.projectName;
     Project.findOne({name: req.params.projectName}, function(err, foundProject){
       if(err){
         console.log(err);
       } else if(foundProject && !err){
           const projIssueId = foundProject.issues.id(req.body.delBtn)
           const projSpecifId = projIssueId._id
           projIssueId.remove()
           foundProject.save(function(err){
             if(!err){
               res.redirect("/issues/" + req.params.projectName)
             } else{
               console.log(err);
             }
           })
         }
     })

})

//////////////////////////////////////UPDATE WITH FORM///////////////////////////////////
app.get("/issues/:projectName/update", function(req, res){

  Project.findOne({name:req.params.projectName}, function(err, foundProject){
    if(!err){
      let id = req.query.linkName;
      const projIssueId = foundProject.issues.id(req.query.linkName)
      const title = projIssueId.title;
      const text = projIssueId.text;
      const created_by = projIssueId.created_by
      const assigned_to = projIssueId.assigned_to
      const open = projIssueId.open
      res.render("update", {path:req.params.projectName, id: id, title: title, text:text,
     created_by:created_by, assigned_to: assigned_to})

    }
  })


})

app.post("/issues/:projectName/update",function(req,res){
  Project.findOne({name: req.params.projectName}, function(err, foundProject){
    if(err){
        console.log(err);
      }else{
        const projIssueId = foundProject.issues.id(req.body._id)
        projIssueId.title = req.body.title || projIssueId.title,
        projIssueId.text = req.body.text || projIssueId.text,
        projIssueId.created_by = req.body.created_by || projIssueId.created_by ,
        projIssueId.assigned_to = req.body.assigned_to || projIssueId.assigned_to,
        projIssueId.open = req.body.closed || req.body.opened,
        projIssueId.updated_on = new Date

        foundProject.save(function(err){
          if(err){
            console.log(err);
          } else{
            res.redirect("/issues/" + req.params.projectName)
          }
        })
      }
    })
  })
      //////////////////////////////////////GET ALL PROJECTS////////////////////////////////
  app.get("/", function(req, res){
      if(req.isAuthenticated()){
        Project.find({}, function(err, foundProjects){
          if(err){
            console.log(err);
          }else{
            res.render("projects", {foundProjects: foundProjects})
          }
        })
      } else{
        res.redirect("/login")
      }
});


  /////////////////////////////////////////POST NEW PROJECT THROUGH INPUT///////////////////
  app.post("/", function(req, res){
    //LODASH ADD
    const addProj = _.capitalize(req.body.addProj)
    Project.findOne({name: addProj}, function(err, foundProject){
        if(foundProject){
          res.json({error: "Project with this name already exists"})
        } else{
          const newProject = new Project({
            name: addProj
          });
          newProject.save();
          res.redirect("/issues/" + addProj)
        }
    })
  })

  app.post("/delete-proj", function(req, res){
    Project.findByIdAndRemove({_id: req.body.delProj}, function(err){
      if(err){
        console.log(err);
      } else{
        res.redirect("/");
      }
    } )
  });
//////////////////////////////////////Login and register routes/////////////////////
app.get("/login", function(req, res){
  res.render("login")
});
app.get("/register", function(req, res){
  res.render("register")
});

app.post("/register", function(req, res){
User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    // res.redirect("/register")
    res.json({error: err})
  } else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/")
    })
  }
})
})

app.post("/login", function(req, res){
const user = new User({
  username: req.body.username,
  password: req.body.password
});
req.login(user, function(err){
  if(err){
    res.json({
      error: err
    })
  } else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/")
    })
  }
})
})
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/login")
})

app.get("/about", function(req,res){
  res.render("about")
})

app.listen(3000, function(req, res) {
  console.log("server started on port 3000");
})
