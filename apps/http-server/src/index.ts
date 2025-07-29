import express from "express"
const app = express()
const PORT = 4000

app.use(express.json())

app.get('/signup' , (req,res)=>{
    const {username , password} = req.body

    if(!username || !password){
        res.json({
            success:false,
            
        })
    }
})


app.get('/signin' , (req,res)=>{
    res.json({
        message:"hello"
    })
})

app.get('/create-room' , (req,res)=>{
    res.json({
        message:"hello"
    })
})

app.listen(PORT , ()=>{
    console.log( `server is on in port ${PORT}`)
})