// function that takes a dotString and converts it to a network
function dotToNetwork(dotString) {
    var dotData = vis.network.convertDot(dotString);
    console.log(dotData);

    var container = document.getElementById("mynetwork");
    var options = {};
    var network = new vis.Network(container, dotData, options);
}