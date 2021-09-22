var linklist = [];
var todo = 0
var complete = 0
var availToDownload = [];
var https_ret = 0;


function getlinks() {
  var init, href, inner, data, i;
  init = document.querySelectorAll('.item-file-link.simple, .item-fle-link.simple.hot');
  init2 = document.getElementsByClassName('item-file');
  for (i = 0; i < init.length; i++) {
    if (document.getElementById(availToDownload[i]).checked) {
      href = init[i].href
      inner = init2[i].innerHTML
      inner = inner.split(">")
      inner = inner[inner.length - 1]
      if (href.includes('exChDir')) {
        data = 0;
        todo++;
      } else {
        data = 1;
      }
      linklist.push([init[i].href, inner, data, 0, '']);
    }
  }
}

function getlinksfromtxt(text, folder, pfolder) {
  var doc = new DOMParser().parseFromString(text, "text/html");
  var init, href, inner, data, i;
  init = doc.querySelectorAll('.item-file-link.simple, .item-fle-link.simple.hot');
  init2 = doc.getElementsByClassName('item-file');
  for (i = 0; i < init.length; i++) {
    href = init[i].href
    inner = init2[i].innerHTML
    inner = inner.split(">")
    inner = inner[inner.length - 1]
    if (href.includes('exChDir')) {
      data = 0;
      todo++;
    } else {
      data = 1;
    }
    linklist.push([init[i].href, inner, data, 0, pfolder + folder + "/"]);
  }
}

function assertHasFolder() {
  for (i = 0; i < linklist.length; i++) {
    if (linklist[i][2] === 0 && linklist[i][3] === 0) {
      return true
    }
  }
  return false
}

function loadHTML(aurl) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      getlinksfromtxt(this.responseText, aurl[1], aurl[4])
      complete++
    }
  };
  xhttp.open("GET", aurl[0], true);
  xhttp.send();
}

function checkifhttps(aurl) {
  // There are many problems with HTTPS-Only mode (this is because mycourses itself doesn't always use https)
  // Prompts the user to add an exception for mycourses if needed
  var xhttpn = new XMLHttpRequest();
  xhttpn.onreadystatechange = function() {
    if(this.readyState === XMLHttpRequest.DONE) {
    if (this.status >= 200 && this.status < 400) {
      https_ret=1; // 1 = Success
    }
    else{
      console.log(this.status)
      console.log(this.readyState)
      //There is https-only mode enabled
      button = document.getElementById("myc-down")
      button.classList.remove("btn-primary");
      button.classList.add("btn-danger");
      button.innerHTML = "<i class='fas fa-times'></i> An error occured: You need to disable HTTPS-Only to use this addon.";
      button.disabled = true
      https_ret=2; // 2 = Failed
    } 
  }  
  };
  xhttpn.open("GET", aurl[0], true);
  xhttpn.send();
}

function countdownloadables() {
  down_count = 0
  for (i = 0; i < linklist.length; i++) {
    if (linklist[i][2] === 1) {
      down_count++;
    }
  }
}

function addColumn() {
  [...document.querySelectorAll('#documentstable tr')].forEach((row, i) => {
    if (i == 0) {
      const cell = document.createElement(i ? "td" : "th")
      cell.innerText = "Download"
      row.appendChild(cell)
    } else {
      const input = document.createElement("input")
      input.setAttribute('type', 'checkbox')
      input.setAttribute('id', "chk_" + (i - 1).toString())
      availToDownload.push("chk_" + (i - 1).toString())
      input.checked = true
      const cell = document.createElement(i ? "td" : "th")
      cell.appendChild(input)
      row.appendChild(cell)
    }
  });
}

function switchCheckedUnchecked () {
  //For future usage
  whatToChangeTo = !document.getElementById(availToDownload[0]).checked
  for (k = 0; k < availToDownload.length; k++) {
    document.getElementById(availToDownload[k]).disabled = whatToChangeTo; // Check/Uncheck the checkboxes
  }
}

function folderopen() {
  for (i = 0; i < linklist.length; i++) {
    if (linklist[i][2] === 0 && linklist[i][3] === 0) {
      linklist[i][3] = 1
      loadHTML(linklist[i]);
    }
  }
}

function zipfiles(linklist) {
  // Download and zip the files in the linklist
  countdownloadables()
  var zip = new JSZip();
  var count = 0;
  var crs = document.getElementsByClassName("row coursetitle")[0].innerText.replace(/ /g, "_")
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();
  var zipFilename = crs + "_" + dd + "-" + mm + "-" + yyyy + ".zip";
  linklist.forEach(function(link) {
    if (link[2] === 1) {
      // Issues with 302 redirection due to CORS, so we will format the urls ourselves
      var re=/(.*):\/\/.*?url=%2F(.*)&cidReq=(.*)$/;
      var splitted=link[0].split(re)
      // If the file is an image, the link is different...
      if (splitted.length==1){
        splitted[3]=document.title.split(" - ")[1]
        var re_img = /(.*):\/\/.*?file=%2F(.*)&cwd/;
        var img_splitted=link[0].split(re_img)
        splitted[1]=img_splitted[1]
        splitted[2]=img_splitted[2]
      }
      var new_link=splitted[1]+"://mycourses.ntua.gr/courses/"+splitted[3]+"/document/"+splitted[2];
      new_link=new_link.replaceAll("%2F","/");
      console.log(new_link)
      JSZipUtils.getBinaryContent(new_link, function(err, data) {
        if (err) { 
          throw err; // or handle the error
        }
        console.log(data);
        var filename = link[4] + link[1].replace(/.*\//g, "");
        zip.file(filename, data, {
          binary: true,
          createFolders: true
        });
        count++;
        if (down_count !== 0) {
          perc = Math.round(count / down_count * 100)
          button.innerText = "Downloading files (" + perc + "%)";
        }
        if (count == down_count) {
          button.innerHTML = "<i class='fa fa-spinner fa-spin'></i> Zipping files";
          zip.generateAsync({
              type: "blob"
            })
            .then(function(blob) {
              saveAs(blob, zipFilename);
              button.innerHTML = "<i class='fa fa-check'></i> Ready!";
            });
        }
      });
    }
  });
}
async function main(button) {
  console.log("Running...")
  // Ok, let's go, first disable the button to make sure that the script doesn't run twice
  button.disabled = true
  button.innerHTML = "<i class='fa fa-spinner fa-spin'></i> Processing files";
  for (k = 0; k < availToDownload.length; k++) {
    document.getElementById(availToDownload[k]).disabled = true; // Disable the checkboxes
  }
  // Get the first batch of links, those in current page.
  getlinks();
  if (linklist.length === 0) {
    // No links, something must have gone wrong :/
    button = document.getElementById("myc-down")
    button.classList.remove("btn-primary");
    button.classList.add("btn-danger");
    button.innerHTML = "<i class='fas fa-times'></i> An error occured";
    button.disabled = true
  } else {
    // Check if HTTPS-Only is used, throw error if it is
    checkifhttps(linklist[0]);
    while(https_ret===0){
      await new Promise(r => setTimeout(r, 1000));
    }
    if(https_ret===2){
      throw new Error("HTML-Only used")
    }
    // Check underlying folders if they exist, find new files/folders
    while (assertHasFolder()) {
      folderopen()
      await new Promise(r => setTimeout(r, 1000));
    }
    while (todo > complete) {
      await new Promise(r => setTimeout(r, 1000));
      console.log("Fetching all links... Status:"+complete+"/"+todo)
    }
    // All file links ready! Lets begin downloading and zipping...
    button.innerHTML = "<i class='fa fa-spinner fa-spin'></i> Downloading & Zipping files";
    zipfiles(linklist);
  }
}

// Initialise the elements (button and checkboxes)
if (document.getElementById("myc-down")) {
  button = document.getElementById("myc-down")
  button.classList.remove("btn-primary");
  button.classList.add("btn-danger");
  button.innerHTML = "<i class='fas fa-sync'></i> Refresh to activate addon";
  button.disabled = true
} else {

  var button = document.createElement("button")
  button.classList.add("btn");
  button.classList.add("btn-primary");
  button.style.width = "auto";
  button.innerHTML = "<i class='fas fa-download'></i> Download selected files & folders";
  button['id'] = 'myc-down'
  button.onclick = function() {
    main(button)
  };
  var x = document.getElementsByClassName("row simpletooltitle");
  x[0].innerHTML += " ";
  x[0].appendChild(button);
  addColumn();
}