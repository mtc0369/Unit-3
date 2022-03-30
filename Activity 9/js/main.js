
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/NRHP List_Wisconsin_Final.csv"),                    
                    d3.json("data/Wisconsin_Counties.topojson")                              
                    ];    
    Promise.all(promises).then(callback);

    function callback(data){    
        csvData = data[0];    
        wiCounties = data[1];    
        //console.log(csvData);
        //console.log(wiCounties);
        var countyNRHP = topojson.feature(wiCounties, wiCounties.objects.Wisconsin_Counties);
        console.log(countyNRHP);          
    };
};


    





