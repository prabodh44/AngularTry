
app.component('bodyComponent', {
    templateUrl: 'components/body.html',
    controller: function(){
        this.name = "prabodh",
        this.alert = function(){
            alert("alert me");
        }
    }
});

// alert('bodyComponent');