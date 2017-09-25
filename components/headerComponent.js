
app.component('headerComponent', {
    templateUrl: 'components/header.html',
    controller: function() {
        this.setView = function(view){
            this.view = view,
            this.onViewChange({$event: {view: view}})
        }
    },
    binding: {
        view: '<',
        onViewChange: '&'
    }
    
});



// ale