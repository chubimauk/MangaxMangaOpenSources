
  const submitsource = async () => {
    var name = document.getElementById("name");
    var NameVal = name.value;
    var filenames = document.getElementById("filenames");
    var filenamesval = filenames.value;
    var version = document.getElementById("version");
    var versionval = version.value;
    var link = document.getElementById("sourcefile");
    var currentLink = link.value;
    var formdata = new FormData();
    formdata.append("name", NameVal);
    formdata.append("version", versionval);
    formdata.append("file", link.files[0], currentLink);
    formdata.append("filename", filenamesval);
    
    var requestOptions = {
      method: 'POST',
      body: formdata,
      redirect: 'follow'
    };
    
    fetch("http://localhost:3000/inject/source", requestOptions)
      .then(response => response.text())
      .then(result => console.log(result))
      .catch(error => console.log('error', error));
}
const getlatestchaps = async () => {
    var lchaps = document.getElementById("latestchaps");
    var lchapsVal = lchaps.value;
    var name = document.getElementById("name");
    var NameVal = name.value;
    const response = await fetch('http://localhost:3000/latest/'+ NameVal +'/' + lchapsVal);
    //console.log(response.text())
    const myJson = await response.json(); //extract JSON from the http response
    var jsons = JSON.stringify(myJson, null, 2)
    document.getElementById("latestchapste").innerHTML = syntaxHighlight(jsons)
    // do something with myJson
  }
  const getpopularchaps = async () => {
    var lchaps = document.getElementById("popularchaps");
    var lchapsVal = lchaps.value;
    var name = document.getElementById("name");
    var NameVal = name.value;
    const response = await fetch('http://localhost:3000/popular/'+ NameVal +'/' + lchapsVal);
    //console.log(response.text())
    const myJson = await response.json(); //extract JSON from the http response
    var jsons = JSON.stringify(myJson, null, 2)
    document.getElementById("popularchapste").innerHTML = syntaxHighlight(jsons)
    // do something with myJson
  }
  const getsearchmanga = async () => {
    var lnames = document.getElementById("searchmangsname");
    var lnamesVal = lnames.value;
    var lPage = document.getElementById("searchmangsnum");
    var lPageVal = lPage.value;
    var name = document.getElementById("name");
    var NameVal = name.value;
    var replacename = lnamesVal.replace(" ","+")
    const response = await fetch('http://localhost:3000/pagedsearch/'+ NameVal +'/' + lPageVal + '/' + replacename);
    //console.log(response.text())
    const myJson = await response.json(); //extract JSON from the http response
    var jsons = JSON.stringify(myJson, null, 2)
    document.getElementById("searchmangste").innerHTML = syntaxHighlight(jsons)
    // do something with myJson
  }
const getserieslink = async () => {
    var lnames = document.getElementById("getseries");
    var lnamesVal = lnames.value;
    var name = document.getElementById("name");
    var NameVal = name.value;
    const response = await fetch('http://localhost:3000/list/'+ NameVal +'?series=' + lnamesVal);
    //console.log(response.text())
    const myJson = await response.json(); //extract JSON from the http response
    var jsons = JSON.stringify(myJson, null, 2)
    document.getElementById("seriesinfo").innerHTML = syntaxHighlight(jsons)
    // do something with myJson
  }
  const getseriespage = async () => {
    var lnames = document.getElementById("getseriespages");
    var lnamesVal = lnames.value;
    var lLink = document.getElementById("getseriespageslink");
    var lLinkVal = lLink.value;
    var lNumber = document.getElementById("getseriespagesnum");
    var lNumberVal = lNumber.value;
    var name = document.getElementById("name");
    var NameVal = name.value;
    const response = await fetch('http://localhost:3000/chapter/'+ NameVal +'?series=' + lnamesVal + '&chapter='+ lLinkVal + '&number='+ lNumberVal);
    //console.log(response.text())
    const myJson = await response.json(); //extract JSON from the http response
    var jsons = JSON.stringify(myJson, null, 2)
    document.getElementById("seriesinfopages").innerHTML = syntaxHighlight(jsons)
    // do something with myJson
  }

  function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}