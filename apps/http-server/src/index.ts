import express from "express"
const app = express()
const PORT = 4000

app.get('/hello' , (req,res)=>{
    res.json({
        message:"hello"
    })
})


app.listen(PORT , ()=>{
    console.log( `server is on in port ${PORT}`)
})