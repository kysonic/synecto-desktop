const fs = require('fs');

setTimeout(()=>{
    const newPath = process.env.FROM;
    const newPathAsar = process.env.TO;
    if(fs.existsSync(newPathAsar)) fs.unlinkSync(newPathAsar);
    fs.rename(newPath,newPathAsar,()=>{
        process.exit(0);
    });
},500);

