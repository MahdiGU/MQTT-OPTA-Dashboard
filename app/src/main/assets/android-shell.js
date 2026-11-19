/* Preserve wire values before the shared presentation invokes localization. */
document.documentElement.dataset.platform='android';
document.querySelectorAll('#commandAction option,#commandTarget option').forEach(option=>option.value=option.value);
