/* Android shell adaptations. All authentication, telemetry and writes use the Java bridge. */
(() => {
  document.documentElement.dataset.platform='android';document.title='ElMAJD Automation';
  I18n.add({'Choose where to save the CSV file.':'Choisissez où enregistrer le fichier CSV.','CSV saved.':'CSV enregistré.','CSV export cancelled.':'Export CSV annulé.','Could not save CSV. Please try again.':'Impossible d’enregistrer le CSV. Veuillez réessayer.'});
  const output=document.createElement('p');output.id='androidExportStatus';output.className='message';output.setAttribute('role','status');output.setAttribute('aria-live','polite');document.getElementById('webProductionLedger').before(output);
  const previous=window.elMajdNativeEvent;window.elMajdNativeEvent=(type,data)=>{previous(type,data);if(type==='csv_export_status')output.textContent=I18n.text(data);};
  I18n.render();
})();
