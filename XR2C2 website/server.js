const express = require('express')
const fs = require("fs")
const app = express()
const path = require('path');
const port = 3000

// Cette ligne indique le répertoire qui contient
// les fichiers statiques: html, css, js, images etc.
app.use('/xr2c2-vitrine', express.static(path.join(__dirname, 'public')))
app.use(function (req, res, next) {
res.header("Access-Control-Allow-Origin", "*");
res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
next();
});


app.set('view engine', 'ejs');

app.get('/xr2c2-vitrine', (req, res) => {

   res.render('index')
})

app.get('/xr2c2-vitrine/project', (req, res) => {

   res.render('project_view', { params: req.query })
})


app.listen(port, () => {
   console.log(`Example app listening at http://localhost:${port}`)
})
