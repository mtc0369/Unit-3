//declaring a global map variables so they are accessible throughout
var mymap;
var dataStats = {};

//function to create the Leaflet basemap
//view centered and constrainedon areas of the US with tornadoes
//zoom constrianed to 6 levels appropriate for the data
function createMap() {
    mymap = L.map('mapid',{
        maxZoom:10,
        minZoom:4,
        scrollWheelZoom:false//scroll zoom disabled
    }).setView([50, -80], 5);
    mymap.setMaxBounds([
        [40, -125],
        [40, -65]
    ]);    

    //adding tile layer 
    L.tileLayer('https://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey={apikey}', {
        attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        apikey: '41071a22bdee4582b8af237baf91198c',
        maxZoom: 22
    }).addTo(mymap);

    //adding text for metadata to map
    L.Control.metaText = L.Control.extend({
        onAdd: function(mymap) {
        var meta = L.DomUtil.create('div');
        meta.id = "meta_text";        
        meta.innerHTML =  "Created By: Michael Connolly; Source: NOAA Storm Prediction Center; Date: 3/9/2022"        
        return meta;                
        },    
        onRemove: function(mymap) {    
        }
    });
    L.control.metaText = function(opts) {return new L.Control.metaText(opts);}
    L.control.metaText({position: 'bottomleft'}).addTo(mymap);

    //adding textbox to map for additional context
    L.Control.infoText = L.Control.extend({
        onAdd: function(mymap) {
        var info = L.DomUtil.create('div');               
        info.id = "info_text";        
        info.innerHTML = '<h2><img  class="popupImage" src="img/tornado.png"><u>Background</u></h2>' +
        '<p>Historically, the worst years on record for tornado fatalities are:</p>' +
        '<p>1) 1917: 551 fatalities</p>' + 
        '<p>2) 1925: 794 fatalities</p>' +
        '<p>3) 1927: 540 fatalities</p>' +
        '<p>4) 1936: 552 fatalities</p>' +
        '<p>5) 2011: 553 fatalities</p>' +
        '<h2><img  class="popupImage" src="img/tornado.png"><u>The Issue</u></h2>' +
        '<p>Most tornado fatalities occur in the southeastern portion of the United States; however, \
        there is also a high frequency of tornado occurances elsewhere, such as the midwestern United States. \
        So why does the southeastern United States consistently have such high numbers of fatalities?'               
        return info;                
        },    
        onRemove: function(mymap) {    
        }
    });
    L.control.infoText = function(opts) {return new L.Control.infoText(opts);}
    L.control.infoText({position: 'topleft'}).addTo(mymap);  

    //calling getData function
    getData(mymap);
};
//function to calculate the min, mean, and max values
function calcStats(data) {
    var allValues = []; //variable for empty array to hold data values
    //for loop to iterate through the array in Deadliest Tornadoes geojson
    for(var state of data.features) {
        //another loop to iterate through each year in the array and retirve pop
        for(var year = 2010; year <= 2020; year +=1) {
            var value = state.properties[String(year)+" Deaths"];
            //console.log(value)
            //push the population values to the empty array above
            allValues.push(value);            
        }
    }
    //get min, max, mean stats for the array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //Calculate meanValue
    var sum = allValues.reduce(function(a,b){
        return a+b;
    });
    dataStats.mean = sum / allValues.length;    
};

//function to calculate the radius of the proportional symbols
function calcPropRadius(attValue) {
    //variable to hold number used in formula below to size Prop sybols evenly
    var minRadius = 3
    //Flannery Appearance Compensation formula held in new variable
    //replaced minRadius in equation with 1, zeros return NaN or Infinity
    var radius = 1.0083 * Math.pow(attValue/1, 0.5715) * minRadius
    
    console.log(radius)
    //return the radius of each symbol
    return radius;
};

//added createPopupContent function to replace the redundant code in pointToLayer and updatepropSymbols functions
function createPopupContent(properties, attribute){
    //build the popup content string - State and attribute label in bold
    var popupContent = "<p><b>State:</b> " + properties.State + "</p>";

    //Adding an image to the popup
    var popupImg = '<img  class="popupImage" src="img/tornado.png">';
    popupContent += "<p>" + popupImg + "</p>";//need += because just an = will override content above

    //adding formatted attribute data to popup content - Tornado fatalities, index 0 for year
    var year = attribute.split(" ")[0];
    popupContent += "<p><b>Tornado Fatalities in " + year + ":</b> " + properties[attribute] + "</p>";
    //return popup content
    return popupContent;
};

//Implemeting popups in a pointToLayer function
function pointToLayer(features, latlng, seqAttributes) {
    //determine which attribute to visulaize with proportional symbols
    //attribute and index calls on the year
    var attribute = seqAttributes[0];//because pointTolayer was reconfigured, the new attribute variable can be passed through this function

    //create and style markers
    var options = {                
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8                     
    };    
       
    //determine the feature values for the attribute
    var attValue = Number(features.properties[attribute]);//forces value to be read as numeric

    //assign circle markers a radius based on the values
    options.radius = calcPropRadius(attValue);

    //create circle marker layer and assign it to new variable
    var layer = L.circleMarker(latlng, options);    

    //calling createPopupContent function to replace redundant code.
    var popupContent = createPopupContent(features.properties, attribute);
    
    //bind the popup to the circle marker and create an offset so popup doesn't cover symbol
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius)
    });
    //return the circlemarker with popup to the L.geoJson pointToLayer option
    return layer;
};

//have to organize the createPropSymbols function differently in order to pass the seqAttributes variable
//need to use ananymous function to call pointToLayer function that now includes the new attribute variable
function createPropSymbols(data, seqAttributes) {
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, seqAttributes);
        }
    }).addTo(mymap);
};

//create function to process data
function processData(data) {
    //create empty array to hold attribute data
    var attributes = [];
    
    //variable for the properties of the first feature in the dataset - 0 index
    var properties = data.features[0].properties;
    //console.log(data.features[0].properties);

    //loop to push each attribute into the array
    for (var attribute in properties) {
        //only take attributes with population values //indexOf function looks through string and determines if and where a string segment occurs 
        if (attribute.indexOf(" Deaths") > -1){
            attributes.push(attribute);//if attribute ocurs and is found, it will be added to the list/array.
        };
    };    
    //return data in attributes container
    return attributes;
};

//Create sequence controls
function createSequenceControls(seqAttributes) {    

    //replaces several DOM elements from earlier script and places the slider on bottom left corner of map.
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function () {
            //creating the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element - slider, combine elements
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="reverse"><img src="img/arrow_reverse.png"></button>');
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">');            
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="forward"><img src="img/arrow_forward.png"></button>');            

            //disable default mouse controls for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    mymap.addControl(new SequenceControl());//add listeners after adding control    

    document.querySelector('.range-slider').max = 10;//direct HTML element representing max value of the slider - index 10
    document.querySelector('.range-slider').min = 0;
    document.querySelector('.range-slider').value = 0;//sets current value
    document.querySelector('.range-slider').step = 1;//tells slider to advance in increments of 1.
    
    //need querySelectorAll to encompase all functions in the class .step
    //forEach loops through each instance of the element
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;            
            //sequence - increment or decrement for the for and rev buttons
            //shorthand if statement, basically creating a continuous loop each way
            if (step.id == 'forward') {
                index++;
                //wraps sequence around to the first attribute once the last attribute is exceeded.
                index = index > 10 ? 0 : index;
            } else if (step.id == 'reverse') {
                index--;
                //wraps sequence around to the last attribute if the first attribute is exceeded.
                index = index < 0 ? 10 : index;
            };
            //updates the slider tool - connects the click loop to the slider, will not work without this. 
            document.querySelector('.range-slider').value = index;

            updatePropSymbols(seqAttributes[index]);//calling updatePropSymbols function            
        });        
    });

    //add an input listener for the slider tool
    //input is default nomenclature for whenever the slider is being used
    document.querySelector('.range-slider').addEventListener('input', function(){
        //to check if the slider is working by creating shorthand variable with this.value
        var index = this.value;
        
        updatePropSymbols(seqAttributes[index]);//calling updatePropSymbols function
        //console.log(index);
        //sequence
    });
};

function updatePropSymbols(attribute) {
    //.eachLayer iterates through every layer added to the map and provides everthing in that layer with each iteration
    mymap.eachLayer(function(layer) {
        //console.log(layer);//shows all objects including the basemap

        //the conditional if statement below selects objects by based on if they have features and attributes.
        if (layer.feature){            
            
            //update the layer style and popup and access feature properties
            //includes all feature properties within 1 data point and holds them in the props variable.
            var props = layer.feature.properties;            

            //update each feature symbols radius based on iterated attribute values
            //access existing calcPropRadius function
            //although its same syntax as an array, it is an object
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //built in function for leaflet that will change the prop symbol radius based on the values
            layer.setRadius(radius);
                   
            //calling createPopupContent function to replace redundant code.
            var popupContent = createPopupContent(props, attribute);

            //update popup content
            popup = layer.getPopup();
            popup.setContent(popupContent).update();//actually sets the content and adds it to popup on map

        };
    });
    updateLegend(attribute);//call updateLegend function
};

//function to update year in legend title
function updateLegend(attribute) {
    //create content for legend
    var year = attribute.split(" ")[0];
    //replace legend content
    document.querySelector("span.year").innerHTML = year;    
};

//creating legend controls
function createLegend() {
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function() {
            //create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //csript for legend
            container.innerHTML = '<p class="temporalLegend"><b>Tornado Fatalities in <span class="year">2010</span><b></p>';

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="275px" height=150px">';            
            
            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){
                //assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);
                //console.log(radius);  
                var cy = 145 - radius;
                //console.log(cy);
                
                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="85"/>';
                //spaces the text next to circles
                var textY = i * 60 + 20;

                //text string
                svg +='<text id="' + circles[i] + '-text" x="170" y="' + textY + '">' + Math.round(dataStats[circles[i]]) + " Fatalities" + "</text>";
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);
            //return container
            return container;
        }
    });
    //adding legend control to map
    mymap.addControl(new LegendControl());
};

//getData function to retrieve data from Deadliest Tornadoes geoJSON
//Callback function calls functions above.
function getData() {
    fetch('data/Deadliest_Tornadoes.geojson')
        .then(function(response){
            return response.json();
        })
        .then(function(json){             
            var seqAttributes = processData(json);            
            calcStats(json);
            createPropSymbols(json, seqAttributes);
            createSequenceControls(seqAttributes)
            createLegend(seqAttributes);           
        });        
};
//loads basemap defined in createMap function and assigned to mymap global variable
document.addEventListener('DOMContentLoaded', createMap);



