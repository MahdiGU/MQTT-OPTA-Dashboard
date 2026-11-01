export function alarmText(code:string,language='en'):string{
  const labels:Record<string,[string,string]>={
    delivery_test:['Controlled email delivery TEST — no equipment fault','TEST contrôlé de remise e-mail — aucun défaut d’équipement'],
    temperature_critical:['Critical temperature','Température critique'],temperature_warning:['Temperature warning','Avertissement de température'],
    controller_offline:['Controller offline','Automate hors ligne'],sensor_fault:['Temperature sensor fault','Défaut de la sonde de température'],
    cooling_unavailable:['Cooling unavailable','Refroidissement indisponible'],cistern_i2:['Cistern 1 empty','Citerne 1 vide'],
    cistern_i3:['Cistern 2 empty','Citerne 2 vide'],cistern_i4:['Cistern 3 empty','Citerne 3 vide'],
    silo_i5:['Alveole silo 1 empty','Silo d’alvéoles 1 vide'],silo_i6:['Alveole silo 2 empty','Silo d’alvéoles 2 vide']
  };
  return labels[code]?.[language==='fr'?1:0]||code.replaceAll('_',' ');
}
