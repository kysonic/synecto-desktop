const fs = require('fs');
console.log(1);
setTimeout(()=>{
    console.log(2);
    const newPath = process.env.FROM;
    const newPathAsar = process.env.TO;
    console.log(3);
    if(fs.existsSync(newPathAsar)) fs.unlinkSync(newPathAsar);
    console.log(4);
    fs.rename(newPath,newPathAsar,()=>{
        console.log(5);
        process.exit(0);
    });
},1000);

