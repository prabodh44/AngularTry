
app.component('bodyComponent', {
    templateUrl: 'components/body.html',
    controllerAs:'$bodyCtrl',
    controller: function(){
        this.name = "prabodh",
        this.alert = function(){
            alert("alert me");
        }
    }
});

// alert('bodyComponent');