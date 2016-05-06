var map_overlays = [];

$(document).ready(function() {
  
  var user;

  $('#launch').click(function() {

    var credentials = getFluxCredentials();
    if (!credentials) {
      redirect('/login');
    } else {
      user = sdk.getUser(credentials);
      user.listProjects()
        .then(function(projects) {
          let size = 1;
          $('#projectlist').empty();
          for (let p of projects.entities) {
            console.log(p.name, p.id);
            $('#projectlist').append("<option data-id=" + p.id + ">" + p.name + "</option>");
            $('#projectlist').attr("size", size);
            size += 1;
          }

          $('#projectlist').dropdown('show');
        });
    }
  });

  $('#projectlist').change(function() {
    let projectid = $('#projectlist option:selected').first().attr('data-id');

    let project = user.getProject(projectid).getDataTable();
    let cellist = project.listCells()
      .then(function(cells) {
        let size = 1;
        $('#cell-list').empty();

        for (let c of cells.entities) {
          console.log(c.label, c.id);
            $('#cell-list').append("<option data-id=" + c.id + ">" + c.label + "</option>");
            $('#cell-list').attr("size", size);
            size += 1;
        }

        $('#cell-list').dropdown('clear').dropdown('show');
      });
  });

  $('#create-cell').click(function() {
    let projectname = $('#projectlist option:selected').first().text();
    $('#cell-name-field-label').text('Enter a name for your new cell in ' + projectname);
    $('#create-cell-modal').modal('show');
  });

  $('.button.create-cell-modal.positive').click(function() {
    let projectid = $('#projectlist option:selected').first().attr('data-id');
    let dt = user.getProject(projectid).getDataTable();
    let cellname = $('#cell-name-field').val();

    dt.createCell(cellname, {}).then(function(result) {
      $('#projectlist').change();
    });

    $('#create-cell-modal').modal('hide');
  });

  $('.button.create-cell-modal.deny').click(function() {
    $('#create-cell-modal').modal('hide');
  });

  $('#write-cell').click(function() {
    let projectid = $('#projectlist option:selected').first().attr('data-id');
    let cellid = $('#cell-list option:selected').first().attr('data-id');

    let cell = user.getProject(projectid).getDataTable().getCell(cellid);
    let cornerSW = findSWCorner(map_overlays);
    let val = map_overlays.map(function(overlay) {return overlayToPrimitive(overlay , cornerSW);});
    cell.update({ value: val}).then(function(result) {console.log(result);});
  });

  $('#clear-map').click(function() {
    map_overlays.forEach(function(overlay) {
      overlay.setMap(null);
    })
    map_overlays = [];
  });

}); 

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.7719981, lng: -122.4115472},
    zoom: 12,
    streetViewControl: false,
    
  });

  var drawingManager = new google.maps.drawing.DrawingManager({
    // drawingMode: google.maps.drawing.OverlayType.MARKER,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.MARKER,
        google.maps.drawing.OverlayType.POLYLINE,
      ]
    },
    markerOptions: {
      // draggable: true
    },
    polylineOptions: {
      fillColor: '#000000',
      fillOpacity: 0.5,
      strokeWeight: 2,
      clickable: false,
      // editable: true,
      zIndex: 1
    }
  });

  google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
    let overlay = event.overlay;
    switch (event.type) {
      case google.maps.drawing.OverlayType.MARKER:
        overlay.overlayType = 'marker';
        break;
      case google.maps.drawing.OverlayType.POLYLINE:
        overlay.overlayType = 'polyline';
        break;
      default:
        console.log('invalid');
        break;
    }
    map_overlays.push(overlay);
  });

  drawingManager.setMap(map);
}

function findSWCorner(overlays) {
  let corner = {lat: Infinity, lng: Infinity};

  function checkCornerSW(ll) {
    corner.lng = ll.lng() < corner.lng ? ll.lng() : corner.lng;
    corner.lat = ll.lat() < corner.lat ? ll.lat() : corner.lat;
  }

  overlays.forEach(function (overlay) {
    switch (overlay.overlayType) {
      case 'marker':
        let position = overlay.getPosition();
        checkCornerSW(position);
        break;
      case 'polyline':
        let positions = overlay.getPath().getArray();
        positions.forEach(checkCornerSW);
        break;
      default:
        break;
    }
  });
  return corner;
}

function overlayToPrimitive(overlay, cornerSW) {
  switch (overlay.overlayType) {
    case 'marker':
      let position = overlay.getPosition();
      return {
        primitive: "point",
        attributes: {
          referencePoint: cornerSW,
          latlng: position,
        },
        point: latlngToPoint(position, cornerSW),
      };
      break;
    case 'polyline':
      let positions = overlay.getPath().getArray();
      return {
        primitive: "polyline",
        attributes: {
          referencePoint: cornerSW,
          latlngs: positions
        },
        points: positions.map(function(position) {return latlngToPoint(position, cornerSW);}),
      }
      break;
    default:
      break;
  }
}

function latlngToPoint(ll, reference) {
  let lat_delta = (ll.lat() - reference.lat) * Math.PI / 180;
  let lng_delta = (ll.lng() - reference.lng) * Math.PI / 180;
  let mean_lat = ((ll.lat() + reference.lat) / 2) * Math.PI / 180;
  let R = 6371009;
  
  // this is an approximation formula for very short distances
  // it loses accuracy as you get larger or closer to the poles
  let x = R * Math.cos(mean_lat) * lng_delta;
  let y = R * lat_delta;

  return [x, y, 0];
}