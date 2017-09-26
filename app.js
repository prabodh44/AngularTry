var app = angular.module('myApp', []);
app.controller('RootController', function(){
    this.view = 'Home'
});


app.component('headerComponent',{
    template: `<h4> Header component </h4>
        <a class = "btn btn-default" ng-class="{'btn-primary' : $ctrl.view === 'Home'}" ng-click="$ctrl.setView('Home')">Home</a>
        <a class = "btn btn-default" ng-class="{'btn-primary' : $ctrl.view === 'About'}" ng-click="$ctrl.setView('About')">About</a>
        `,
    controller: function(){
        this.setView = function(view){
            this.view = view;
            this.onViewChange({header : {view : view}});
            //this.onTest();
            //console.log(this.onViewChange({$event: {view : view}}));
        }
        
    },
    bindings:{
        view: '<',
        onViewChange: '&',
        onTest : '&'
    },
    
});

app.component('bodyComponent', {
    template: `<p> {{ $ctrl.view }} has been clicked</p>`,
    bindings: {
        view: '<'
    }
});

///////////////////////////////////////Practice/////////////////////////////////////////
