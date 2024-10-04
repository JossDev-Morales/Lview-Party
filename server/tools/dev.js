let headersList = {
    "Accept": "*/*",
    "User-Agent": "Thunder Client (https://www.thunderclient.com)",
    "Content-Type": "application/json"
   }
   let builded={
    email:"thejosuescript@gmail.com",
    password:"Keyjo2803"
   }
   let bodyContent = JSON.stringify({
     email:builded.email,
     password:"Keyjo2803"
   });
   
   let response = await fetch("http://127.0.0.1:3000/api/auth/signin", { 
     method: "POST",
     body: bodyContent,
     headers: headersList
   });
   
   let data = await response.json();
   console.log(data.user.name);
   