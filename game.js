/* Brothers Kingdoms Frontier — canvas world, realtime multiplayer and responsive command UI. */
(()=>{
'use strict';
const E=window.BKEngine,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Phosphor MIT icons for interface actions; shared geometric paths for buildings.
const UI_ICON_NAMES={food:'grains',wood:'tree',stone:'mountains',gold:'coins',farm:'grains',lumber:'tree',quarry:'mountains',mine:'coins',barracks:'sword',fort:'shield',city:'buildings',capital:'castle-turret',economy:'coins',war:'sword',logistics:'flag-banner'};
const OLD_CC0='assets/tiny-swords-cc0/';
const CC0_BUILDINGS=new Set(['capital','city','barracks','fort','farm','lumber','quarry','mine']);
const CC0_RESOURCES=new Set(['food','wood','stone','gold']);
// The city's new silhouette is the previous capital; the barracks use the previous city's.
const BUILDING_SPRITE_FILES={city:'capital',barracks:'city'};
const buildingSpriteFile=kind=>BUILDING_SPRITE_FILES[kind]||kind;
const buildingSpritePath=kind=>OLD_CC0+'buildings/'+buildingSpriteFile(kind)+'.png';
const uiIcon=name=>{
 if(CC0_BUILDINGS.has(name))return `<img class="ui-icon tiny-building-art" src="${buildingRoofUrl(name,state?.phase==='playing'?myId:null,1)}" alt="" aria-hidden="true"/>`;
 if(CC0_RESOURCES.has(name))return `<img class="ui-icon tiny-resource-art" src="${OLD_CC0}resources/${name}.png" alt="" aria-hidden="true"/>`;
 const id=UI_ICON_NAMES[name]||name;
 const set=id==='flag-banner'?'controls':'game';
 return `<svg class="ui-icon" viewBox="0 0 256 256" aria-hidden="true"><use href="assets/icons/${set}.svg#${id}"></use></svg>`;
};
const view=$('mapView'),canvas=$('mapCanvas'),ctx=canvas.getContext('2d',{alpha:false}),mini=$('minimap'),mctx=mini.getContext('2d');
const terrainNames=['Sea','Plains','Forest','Hills','Fertile Land','Ore Deposit','Mountains'];
/* Same geometry in catalogue, placement indicator and map. Color identifies ownership. */
const BUILDING_PATHS={"farm":"M256 23.38L89.844 89.845l-64.9 162.254 14.85 5.943c20.312-50.766 40.62-101.535 60.93-152.304l1.432-3.58L256 40.616l153.844 61.54 1.43 3.58 60.93 152.305 14.853-5.942-64.9-162.254C366.77 67.69 311.386 45.534 256 23.38zm0 36.624l-139.996 55.998L72.8 224h.2v263h78V329h-39v-18h297v176h30V224h.2c-14.402-36-28.802-72-43.204-107.998L256 60.004zM151 135h210v114H151V135zm23.563 18L199 201.873V153h-24.438zM313 153v48.873L337.438 153H313zm-144 29.127V231h24.438L169 182.127zm174 0L318.562 231H343v-48.873zm-98.73 18.69c-1.207-.02-2.31.02-3.288.128-2.823.31-10.76 3.708-16.86 7.3-2.796 1.645-5.23 3.22-7.122 4.484V231h78v-16.97c-4.193-1.675-10.334-4.02-17.578-6.368-11.206-3.63-24.71-6.71-33.152-6.846zM160 263h192v18H160v-18zm15.16 66L208 389.205 240.84 329h-65.68zm144 0L352 389.205 384.84 329h-65.68zM169 355.295v105.41L197.748 408 169 355.295zm78 0L218.252 408 247 460.705v-105.41zm66 0v105.41L341.748 408 313 355.295zm78 0L362.252 408 391 460.705v-105.41zm-183 71.5L175.16 487h65.68L208 426.795zm144 0L319.16 487h65.68L352 426.795z","lumber":"M18.53 19.688V61.03c72.043 13.54 136.044 34.786 205.126 63.907v.032c12.827 4.56 21.984 12.106 26.844 21.186 4.94 9.23 5.268 19.71 1.75 28.563-6.227 15.67-24.807 25.573-45.78 20.374-10.345 19.927-23.93 39.623-42.407 58.937 11.14 7.005 22.513 13.16 34.187 18.532H307.5c20.216-54.396 32.977-109.693 38.344-160.937-104.518-15.22-203.62-46.673-297.813-91.938h-29.5zm317.095 229c-2.58 8.03-5.326 16.08-8.22 24.093h28.94v18.69h-161.69v-.22h-.593l-1.843-.844c-16.61-7.513-32.607-16.53-48.126-27.062l-3.156-2.125c-10.943 4.44-19.705 9.41-25.563 14.342-7.023 5.915-9.563 11.066-9.563 15.594 0 4.53 2.54 9.71 9.563 15.625 7.023 5.916 18.168 11.9 32.313 16.94 28.29 10.075 68.477 16.56 112.906 16.56 44.428 0 84.648-6.485 112.937-16.56 14.146-5.04 25.29-11.024 32.314-16.94 7.023-5.913 9.562-11.095 9.562-15.624 0-4.527-2.54-9.68-9.562-15.594-7.024-5.914-18.168-11.9-32.313-16.937-10.984-3.913-23.774-7.277-37.905-9.938zm-234.03 70.843c-5.044 82.403-40.128 102.984-71.44 125.095 20.57 4.536 43.68 8.43 66.94 7.563 25.204-9.846 51.443-36.288 70.405-57.47-8.154 19.774-19.6 39.024-34.563 58.376L106.97 492.53c44.538-7.387 86.41-17.235 129.25-46.374-7.942-20.833-13.978-41.123-18.22-61.187 16.816 26.81 35.478 52.765 57.125 76.655.03.033.064.06.094.094l31.967 30.655c25.176-31.428 43.748-65.536 58.563-99.875-.153 15.875-1.45 32.3-5 49.594 43.973 9.924 87.933 3.585 131.906 2.53-44.83-18.237-70.754-54.62-75.344-123.093-9.53 7.867-22.24 14.347-37.5 19.783-31.12 11.084-72.99 17.656-119.218 17.656-46.227 0-88.068-6.573-119.188-17.658-15.56-5.542-28.473-12.174-38.062-20.25-.6-.504-1.175-1.01-1.75-1.53z","quarry":"M205.361 49.538c-15.867 19.005-28.39 48.131-39.488 73.392-11.93-16.218-24.672-32.051-41.172-46.097 15.568 25.842 17.773 51.192 28.035 77.093-17.84-14.584-39.392-25.488-64.162-33.79 21.037 14.94 33.77 31.53 45.715 50.156-30.948 16.73-46.247 47.694-66.486 75.994-11.118-13.549-20.631-28.163-27.68-47.664 1.485 28.14 6.877 53.49 11.469 68.48 4.591 14.991 3.819 18.709 2.02 19.356-9.649-14.243-16.356-29.496-29.715-43.804 3.282 26.95 15.324 41.297 20.603 60.372-4.905 9.376-8.4 1.866-19.958-7.236 1.912 11.572 12.614 27.236 12.52 40.367-1.373 28.952 5.954 39.675 30.225 43.965 36.178 6.97 59.993 14.477 64.572 20.375 2.29 3.753 5.038 13.403 5.954 22.517 2.29 24.663 22.897 30.56 118.15 32.168 43.963.536 90.213 3.217 102.578 5.362 21.524 3.753 22.897 3.219 34.346-12.866 10.075-13.94 16.486-17.696 37.093-21.449 27.935-4.29 45.797-13.403 45.797-23.59-5.324-10.812-14.225-16.439-24.005-21.385-2.207.596-4.184 1.311-6.18 2.043-23.005 8.894-41.12 26.06-62.32 34.356-16.53 5.821 1.742 16.57-24.731 13.402-13.43-4.255-36.605 11.139-49.965 15.856l-5.875-17.014c.44-.152 4.064-1.802 9.285-4.254.526-12.01.254-22.902-.644-32.848-9.08-13.521-24.01-27.444-35.904-21.257-6.412 3.753-4.806 13.68-3.432 17.968 2.407 12.522-15.653.641-16.043 11.526 0 3.217-4.123 10.187-9.16 15.549-10.533 10.186-21.437 3.594-14.11-26.43 8.701-36.458 43.684-47.3 62.918-26.926 6.331 6.486 10.356 3.88 10.659-.498a181.726 181.726 0 0 0-6.647-20.795l-11.512 4.492c-6.892-19.519-13.4-41.262-11.16-57.851l.7-4.633 4.197-2.086c43.814-21.76 91.052-39.01 137.716-50.316-7.333-21.903-18.344-46.195-30.396-52.358-16.88-8.631-46.033-19.451-64.965-21.338 11.543-20.579 17.61-41.534 33.533-61.445-14.553 9.802-26.694 21.414-38.23 33.479 3.08-18.148 5.064-36.012 13.096-54.909-12.73 14.909-22.118 31.09-30.813 47.537-6.73-15.507-14.259-30.787-24.615-45.257 5.894 18 6.73 34.686 8.017 51.566-31.938.027-70.784-9.862-96.904 1.86 2.712-26.93 5.275-57.917 17.074-81.135zm9.942 95.45c10.242-.01 20.155 4.589 15.472 17.526-14.861 41.06-45.066 8.319-49.01 38.086-1.253 20.96 13.541 27.807-5.497 31.635-17.26 3.463-44.749-3.794-47.955 13.539-5.63 23.76 14.015 35.159 41.681 34.965 22.946 3.035 31.982 41.861 20.48 62.926-1.373 1.608-4.12-3.754-5.953-11.26-8.847-24.871-26.902-37.822-43.044-19.301-8.701 10.187-13.957 9.25-13.957-.4 0-11.26-16.268-42.493-23.137-42.493-21.248 13.468-20.583 60.367-43.637 63.825-9.973 1.495-2.338-11.435 4.175-23.863 6.512-12.429 11.6-22.905 11.86-30.758 16.788-44.943 85.81-133.833 138.522-134.426zm152.855 44.802c-17.639 4.004-108.586 74.902-112.195 70.771-8.665-8.682 44.148-80.222 112.195-70.771zm104.894 28.79c-14.439 19.03-11.194 54.971-15.863 77.178-1.456-.693-3.12-1.301-4.521-1.777.902 19.875 2.43 40.19-.586 63.238 10.85-11.677 39.307-25.027 29.506-42.98 1.913-20.555-1.662-37.304 6.515-60.018-8.958 11.807-11.895 20.01-18.058 28.612-1.837-17.86-3.446-46.327 3.007-64.252zm-38.37 27.072c-44.992 10.578-97.79 29.46-140.381 50.198-.496 9.027 1.518 17.849 4.533 27.068l142.978-55.567c-.93-7.648-1.739-17.164-7.13-21.699zm-.094 45.048l-28.35 10.935c.58 26.518 2.381 53.496.827 81.037 9.155-2.912 17.712-5.96 23.974-10.746 6.933-29.604 4.554-54.35 3.549-81.226zm-96.746 36.422c-7.218 2.605-14.333 5.488-21.48 8.277 8.236 21.45 14.305 48.237 13.745 83.297 7.214-2.2 13.549-4.9 18.766-8.524-2.796-29.236-3.857-58.891-11.031-83.05z","mine":"M403.818 33.117l-369.554 15.4v46.012L426.97 79.425l-23.152-46.31zM385.334 99.04l-30.408 1.17 9.78 185.806 38.554-7.71L385.334 99.04zm-135.152 5.198l-18.39.71-2.694 15.61-26.578 18.75.13.866-.273-.047-3.063 17.738 6.188 1.07 4.617 30.395 31.532 5.445 14.543-27.088 6.186 1.07 3.063-17.74-.273-.046.416-.773-18.75-26.578 3.346-19.382zm-77.444 2.98l-22.82.878-39.47 54.775-1.692 33.138 63.982-88.79zm-77.625 2.985l-31.275 1.203-28.72 272.832 45.66 6.733 14.335-280.767zM236.928 128.1l14.457 20.49-34.947-6.035 20.49-14.455zm-20.516 32.718l28.87 4.985-7.012 13.064-19.63-3.39-2.228-14.66zM437.12 289.89l-76.434 15.288-44.99-14.998-28.706 28.703h169.457L437.12 289.89zm-260.05 2.268l-9.42 20.725h-16.386v18h8.205l-7.275 16h-22.93v18h14.75l-8.183 18h-26.568v18h18.386l-13.636 30h-24.75v18h16.568l-8.762 19.275 16.387 7.45 12.147-26.725h143.423l-6.75-18H133.785l13.637-30h103.605l-6.75-18h-88.673l8.18-18h73.74l-6.75-18h-58.807l7.273-16h45.535l-4.498-12h41.258l6-6h-80.113l6.035-13.276-16.387-7.45zm69.182 44.725l40.36 107.635c6.022-8.242 15.748-13.635 26.652-13.635 11.916 0 22.43 6.438 28.234 16h55.53c5.804-9.562 16.32-16 28.236-16 10.424 0 19.768 4.93 25.832 12.564l26.64-106.564H246.252zm67.012 112c-8.39 0-15 6.61-15 15s6.61 15 15 15 15-6.61 15-15-6.61-15-15-15zm112 0c-8.39 0-15 6.61-15 15s6.61 15 15 15 15-6.61 15-15-6.61-15-15-15z","barracks":"M238.15 27.912c-6.137-.1-11.52 1.41-13.684 6.233-14.05 31.318-79.7 23.9-79.7 23.9s69.36 30.762 80.006 7.746c3.323-7.183 12.94-3.388 21.86 2.32v14.083h18v-48h-.317v-.048s-14.45-6.044-26.166-6.233zM236.947 106c-11.675 10.48-24.022 20.88-36.828 31.14 7.543 1.584 15.372 2.845 23.365 3.778 4.96-11.815 9.51-23.587 13.463-34.918zm37.367 0c3.978 11.403 8.56 23.254 13.557 35.145 8.025-.903 15.902-2.166 23.516-3.81-12.893-10.323-25.324-20.788-37.073-31.335zm-18.683 1.307c-3.855 11.432-8.343 23.274-13.242 35.177 8.81.44 17.7.483 26.53.114-4.917-11.942-9.42-23.822-13.288-35.29zm-73.588 43.996c-46.038 35.3-96.618 68.54-143.285 97.12 1.217.248 2.053.476 3.333.723 11.547 2.236 25.905 4.6 40.728 6.577 27.893 3.718 58.116 5.65 72.39 3.785 14.247-15.19 33.37-45.538 50.37-79.537 3.562-7.122 7.01-14.403 10.337-21.736-11.72-1.634-23.104-3.952-33.873-6.93zm147.305.097c-10.862 3.144-22.245 5.487-33.89 7.082 3.293 7.25 6.702 14.447 10.223 21.49 17.19 34.378 36.56 65.054 50.855 80.065 12.622 3.79 43.378 2.474 71.686-2.014 16.737-2.653 32.776-6.15 45.017-9.15-46.827-28.652-97.645-62.024-143.89-97.473zm-94.566 8.844c-4.178 9.377-8.56 18.695-13.1 27.776-14.633 29.264-30.29 55.677-45 74.12 52.564 9.756 105.1 9.282 157.805-.113-14.684-18.437-30.307-44.803-44.91-74.007-4.512-9.026-8.87-18.287-13.024-27.606-13.897.935-27.96.852-41.772-.17zM45.14 268.016c1.51 3.31 3.41 6.715 5.756 9.92 6.94 9.49 16.894 17.332 30.103 19.36 12.877 1.98 31.776-2.842 46.542-10.376 5.164-2.635 9.784-5.57 13.52-8.43-17.68.154-39.405-2.097-60.62-4.926-12.575-1.676-24.687-3.616-35.302-5.548zm420.353 1.326c-10.35 2.248-22.076 4.497-34.453 6.46-19.848 3.145-40.16 5.757-57.58 5.046 3.05 2.086 6.51 4.158 10.262 6.072 14.766 7.534 33.665 12.355 46.543 10.377 13.21-2.03 23.16-9.87 30.103-19.36 2.034-2.78 3.725-5.707 5.125-8.595zm-141.68 12.787c-45.28 6.767-90.67 7.142-136.048.265 17.098 14.243 42.385 30.798 67.867 30.798 25.64 0 51.08-16.762 68.18-31.064zm-157.93 5.75l-26.17 183.202c2.46-2.586 5.07-5.418 7.88-8.648 12.418-14.272 27.746-34.338 42.54-56.64 16.338-24.63 31.832-52.305 42.44-77.603-28.778-7.38-52.738-26.782-66.69-40.31zm179.497 0c-13.95 13.528-37.91 32.93-66.69 40.31 10.61 25.3 26.103 52.974 42.442 77.605 14.793 22.3 30.12 42.367 42.54 56.64 2.81 3.23 5.42 6.06 7.88 8.647l-26.172-183.2zm-198.95 8.89c-3.338 2.178-6.917 4.25-10.708 6.185-17.234 8.794-38.335 15.072-57.457 12.135-2.14-.33-4.216-.772-6.233-1.307-.297 11.435-.76 22.815-1.502 34.088l1.15 2.292c4.487 8.96 12.6 14.342 24.655 16.565 11.153 2.055 25.404.882 40.648-3.834l9.446-66.123zm218.405 0l9.445 66.123c15.244 4.716 29.496 5.89 40.65 3.834 12.055-2.223 20.167-7.605 24.655-16.565l1.148-2.29c-.743-11.274-1.204-22.654-1.502-34.09-2.015.536-4.09.98-6.23 1.308-19.123 2.937-40.224-3.34-57.458-12.135-3.79-1.934-7.37-4.007-10.707-6.185zm-113.34 34.32c-11.326 28.27-28.61 57.89-46.363 84.654-7.84 11.82-15.797 22.984-23.465 33.11 49.686-10.67 98.99-11 147.875-.075-7.65-10.106-15.59-21.246-23.41-33.036-17.753-26.763-35.037-56.383-46.363-84.654-1.374.065-2.752.103-4.138.103-1.387 0-2.765-.038-4.137-.103zm-183.21 42.56c-3.772 34.142-10.874 66.95-24.282 97.034 18.45 6.217 51.83 15.22 75.713 13.09l14.49-101.436c-14.543 3.57-28.552 4.41-41.135 2.09-9.224-1.7-17.784-5.3-24.786-10.778zm374.694 0c-7.003 5.478-15.562 9.077-24.788 10.778-12.582 2.32-26.59 1.48-41.132-2.09l14.49 101.435c23.88 2.13 57.262-6.873 75.71-13.09-13.407-30.083-20.51-62.89-24.28-97.033z","fort":"M25 41v110h462V41h-21v55h-36V41h-60v55h-36V41h-60v55h-36V41h-60v55h-36V41H82v55H46V41H25zm0 128v206h62v-46H64v-18h71v-46H96v-18h96v18h-39v46h71v18h-7v46h270V169h-30v39h-18v-39H329v39h-18v-39H201v39h-18v-39H73v39H55v-39H25zm247 78h176v18h-87v55h-18v-55h-71v-18zm-167 82v46h94v-46h-94zm-80 64v94h47.973l14.297-57.184 17.46 4.368L91.527 487h328.946l-13.203-52.816 17.46-4.368L439.027 487H487v-94H346.98l13.846 69.234-17.652 3.532L328.62 393H183.38l-14.554 72.766-17.652-3.532L165.02 393H25z","city":"M208 80v25h-13v126h18v-71c0-5.5 1.4-10.5 4.3-14.4 3-3.9 7.8-6.5 12.7-6.5 5 0 9.7 2.7 12.7 6.6 2.9 3.9 4.3 8.8 4.3 14.3v71h18v-71c0-5.5 1.4-10.5 4.3-14.4 2.9-3.9 7.7-6.6 12.7-6.6 5 0 9.8 2.7 12.7 6.6 2.9 3.9 4.3 8.9 4.3 14.4v71h18V105h-13V80h-18v25h-21V80h-18v25h-21V80h-18zM16 112v32h9v71h78v-65.9h9V112H94v25H73v-25H55v25H34v-25H16zm384 0v32h9v71h78v-71h9v-32h-18v25h-21v-25h-18v25h-21v-25h-18zm-265 32v25h-14v64h-16v254h110v-81.6c0-17.5 4.4-31.5 11.8-41.4 7.4-9.9 18.2-15.6 29.2-15.6s21.8 5.7 29.2 15.6c7.4 9.9 11.8 23.9 11.8 41.4V487h110V233h-16v-64h-14v-25h-18v25h-24v80H177v-80h-24v-25h-18zm-94 89v254h46V233H41zm384 0v254h46V233h-46zm-290 7h18v48h-18v-48zm224 0h18v48h-18v-48zM135 359h50v50h-50v-50zm192 0h50v50h-50v-50zm-71 7.4c-5 0-10.2 2.3-14.8 8.4-4.6 6.1-8.2 16.1-8.2 30.6V432h46v-26.6c0-14.5-3.6-24.5-8.2-30.6-4.6-6.1-9.8-8.4-14.8-8.4zM153 377v14h14v-14h-14zm192 0v14h14v-14h-14z","capital":"M32 2 L41 22 L62 25 L46 40 L51 62 L32 50 L13 62 L18 40 L2 25 L23 22 Z"};
const buildingPaths=Object.fromEntries(Object.entries(BUILDING_PATHS).map(([id,d])=>[id,new Path2D(d)]));
const BUILDING_PALETTE={farm:'#F0AD6D',lumber:'#69D9A4',quarry:'#B6BFCF',mine:'#F5D45A',barracks:'#85B4FF',fort:'#FF8188',city:'#C49BFF',capital:'#f1f5fa'};
const BUILDING_KINDS=['capital','city','barracks','fort','farm','lumber','quarry','mine'];
// Stable ownership/level palette shared across types; never encode type by hue.
const buildingLevelColor=b=>{
 const hex=b.owner==null?'#829bb8':color(b.owner);
 const rr=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),bb=parseInt(hex.slice(5,7),16);
 const hue=rgbHue(rr,gg,bb),level=Math.max(1,Math.min(5,b.level||1));
 return `hsl(${Math.round(hue)} 75% ${Math.round(37+level*9)}%)`;
};
const BUILDING_PRIORITY={capital:9,fort:8,barracks:7,city:6,mine:3,quarry:3,lumber:3,farm:3};

const buildingArt=(kind,owner=null,level=1)=>`<img class="building-art tiny-building-art" src="${buildingRoofUrl(kind,owner,level)}" alt="" aria-hidden="true"/>`;
const BUILDING_CODES={capital:'HQ',city:'CT',barracks:'BA',fort:'FT',farm:'FM',lumber:'WD',quarry:'ST',mine:'AU'};
const buildingInfo={
 farm:{short:'Feeds your army.',detail:'+8 food/s per level',place:'Your land, excluding mountain summits',resource:'food',perLevel:8},
 lumber:{short:'Produces wood for development.',detail:'+7 wood/s per level',place:'Forests only',resource:'wood',perLevel:7},
 quarry:{short:'Produces stone for buildings.',detail:'+7 stone/s per level',place:'Hills or mountains',resource:'stone',perLevel:7},
 mine:{short:'Produces gold for research.',detail:'+7 gold/s per level',place:'Ore, hills, or mountains',resource:'gold',perLevel:7},
 barracks:{short:'Increases army capacity.',detail:'+430 troop capacity · +5 recruitment/s per level',place:'Your land, excluding mountain summits',cap:430,rate:5},
 fort:{short:'Defends nearby tiles.',detail:'Defense radius 4 · enemy building sight 14 / 20 / 26 / 32 tiles',place:'Your land, including mountains'},
 city:{short:'Produces food, gold, and troops.',detail:'+5 food/s · +5 gold/s · +260 capacity · +3 recruitment/s per level',place:'Your land, excluding mountain summits',cap:260,rate:3}
};
const nameResource={food:'Food',wood:'Wood',stone:'Stone',gold:'Gold'};
const briefCost=c=>Object.entries(c||{}).map(([k,v])=>`<span class="cost-unit">${uiIcon(k)}${number(v)}</span>`).join(' ');
function buildingBenefit(id,p,level=1){const b=buildingInfo[id];if(!b)return '';if(b.resource)return `+${Math.round(b.perLevel*level*(1+.25*(p?.tech?.economy||0)))}/s ${({food:'food',wood:'wood',stone:'stone',gold:'gold'})[b.resource]}`;if(id==='city')return `+${24*level} workers · +${Math.round(5*level*(1+.25*(p?.tech?.economy||0)))}/s food and gold · +${260*level} capacity · +${3*level} recruitment/s`;if(id==='barracks')return `+${430*level} capacity · up to +${5*level} recruits/s · ${level} food/s at full output`;if(id==='fort')return `up to +${(18.5*level).toFixed(1)} defense within radius 4 · base sight ${E.fortRadius({level})} tiles · hills +25% · mountains +50%`;return b.detail;}
function techBenefit(id,level){if(id==='economy')return `Income multiplier ×${(1+level*.25).toFixed(2)}`;if(id==='war')return `Stronger attacks · defense +${(1.9*level).toFixed(1)} · recruitment +${2*level} troops/s`;if(id==='logistics')return `Conquest troop losses −${8*level}%`;return '';}
function resourceRates(p){
 const c=E.counts(state,p.id),land=p.land||0,m=1+(p.tech.economy||0)*.25;
 const gross=p.income||{
  food:Math.round((2+land/100+c.farm*8+c.city*5)*m),
  wood:Math.round((1+land/180+c.lumber*7)*m),
  stone:Math.round((1+land/200+c.quarry*7)*m),
  gold:Math.round((1+land/220+c.mine*7+c.city*5)*m)
 };
 const cap=p.troopCap||Math.floor(900+land*2.4+c.barracks*430+c.city*260);
 const expected=Math.max(0,Math.min(cap-E.militaryStrength(state,p.id).total,Math.round(4+land/100+c.barracks*5+c.city*3+p.tech.war*2)));
 const recruited=p.troopIncome===undefined?Math.min(expected,Math.floor(((p.res.food||0)+gross.food)/.2)):p.troopIncome;
 const foodNet=Math.floor(gross.food||0)-Math.ceil(Math.max(0,recruited||0)*.2);
 return {gross,recruited,foodNet};
}
const costText=c=>Object.entries(c||{}).map(([k,v])=>({wood:'Wood',stone:'Stone',gold:'Gold',food:'Food'}[k]||k)+' '+v).join(' · ');
const number=n=>Math.floor(n||0).toLocaleString('en-US');
const hudNumber=n=>{const value=Math.floor(Number(n)||0);return Math.abs(value)<10000?number(value):(Math.trunc(value/100)/10).toLocaleString('en-US')+'k';};
let dragHint=null;
let attackPlanner=null,planCancelArmy=null;
let defeatDismissed=false,menuPausedSolo=false;
let state=null,myId=null,host=false,demo=false,peer=null,upstream=null,code='',connections=new Map(),lastSendTime=new Map(),phaseShown='',timer=0;
let lastHudPlayer=null,lastHudTick=-1,lastHudLand=null,lastHudOwners=null,lastHudArmies=new Map(),hudNotice=null,hudAlertAction=null;
let activeThreats=[],announcedThreats=new Set(),lastThreatSignature="",attackFocusIndex=0,threatBannerUntil=0;
let quickBuildOpen=false,buildPlacementChecks=0;
let zoom=1.05,camX=0,camY=0,terrainSeed=null,pressed=new Map(),pointerStart=null,gesture=null,selected=null,buildMode=null,percent=30,tooltipTimer=null,worldLayer=null,paintedRevision=-1,miniRevision=-1,renderQueued=false,panelOpen=false;let toastTimeout=null,target=null,redirectArmy=null,pauseSolo=false,moveCursor=null,lastTap=0,lastStateAt=Date.now(),pendingOrders=new Map(),seq=0,readyLocal=false,reconnectTries=0,reconnectTimer=null,connectTimer=null,tokenStore=new Map(),previousFocus=null,showTutorialOnce=true,lastRoster='',previousOwners=new Map(),previousRevs=new Map(),lastSaveTick=-1,oldArmyPositions=new Map(),movementStart=0,lastAnnounced='';
const TILE=14;const mine=()=>state?.players.find(p=>p.id===myId);const color=id=>state?.players.find(p=>p.id===id)?.color||'#e8f3f3';
function toast(msg,kind){
 const inGame=!$('game').classList.contains('hidden');
 if(inGame&&kind!=='error'&&/^(Order completed|Erased |Army focus|Focus selection|Tap your land|Construction queued|Offensive started|Offensive plan (created|updated)|Work zone saved)/i.test(String(msg)))return;
 const t=inGame?$('gameToast'):$('toast');
 const severity=kind||(/missing|not enough|rejected|error|no connection|cannot|failed|unavailable|disconnected|outdated/i.test(String(msg))?'error':/ready|completed|victor|started|researched/i.test(String(msg))?'success':'info');
 t.dataset.kind=severity;t.textContent=msg;t.title=msg;if(inGame)t.innerHTML='<span class="notification-text">'+esc(msg)+'</span>';$('gameError').textContent=severity==='error'?msg:'';
 $('toast').classList.add('hidden');
 t.classList.remove('hidden');
 clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.add('hidden'),2450);
}
function show(screen){
 for(const name of ['lobby','waiting','game'])$(name).classList.toggle('hidden',name!==screen);
 if(screen==='game'){$('toast').classList.add('hidden');setTimeout(resize,10);}
 else $('gameToast').classList.add('hidden');
 if(screen==='lobby')updateResume();
}
function error(s){$('lobbyError').textContent=s;toast(s);}
// One auxiliary surface at a time. No panel stacks above another.
const AUX_IDS=['armiesPanel','quickLeadersPanel','contextCard','sessionPanel','exitPanel'];
// A single tactical surface owns each list; the old overlays are retained only
// as hidden compatibility containers. Moving nodes keeps handlers and live state.
let militaryTab='nations';
$('warHubArmy').appendChild($('armiesList'));
$('warHubThreats').appendChild($('threatList'));
function syncMilitaryThreats(){
 const count=activeThreats.length,inside=militaryTab==='threats'&&!$('warPanel').classList.contains('hidden');
 $('warThreatCount').textContent=count?String(count):'';
 $('warThreatEmpty').classList.toggle('hidden',!!count);
 $('threatList').classList.toggle('hidden',!count);
 $('incomingAttack').setAttribute('aria-expanded',String(inside));
}
function chooseMilitaryTab(tab){
 militaryTab=['nations','threats','army'].includes(tab)?tab:'nations';
 for(const t of ['nations','threats','army']){
  const active=t===militaryTab;
  $('warHub'+t[0].toUpperCase()+t.slice(1)).classList.toggle('hidden',!active);
  $('warTab'+t[0].toUpperCase()+t.slice(1)).setAttribute('aria-selected',String(active));
  $('warTab'+t[0].toUpperCase()+t.slice(1)).tabIndex=active?0:-1;
 }
 $('warPanel').scrollTop=0;
 if(militaryTab==='nations')renderWars();
 if(militaryTab==='army')renderArmies();if(defensePicking)refreshArmyFocus();
 if(militaryTab==='threats')syncMilitaryThreats();
}
function openMilitary(tab='nations'){
 $('warPanelList').querySelectorAll('.focused').forEach(el=>el.classList.remove('focused'));
exitArmyFocus();
 if($('warPanel').classList.contains('hidden')){
  hideAux();closePanelIfOpen();toggleQuickBuild(false);
  selected=null;setPreview(null);buildMode=null;refreshQuickBuild();suspendMapGesture();
 }
 $('warPanel').classList.remove('hidden');
 $('warChip').setAttribute('aria-expanded','true');
 chooseMilitaryTab(tab);
}
function closeNations(){ $('warPanelList').querySelectorAll('.focused').forEach(el=>el.classList.remove('focused')); $('warPanel').classList.add('hidden');$('warChip').setAttribute('aria-expanded','false'); }
function suspendMapGesture(){
 pressed.clear();pointerStart=null;gesture=null;
 if(attackPlanner){const plan=attackPlanner;plan.pointerId=null;plan.lastPoint=null;plan.strokeStart=null;plan.strokeOrigin=null;plan.brushPoint=null;plan.touchLocked=false;}
}
function mapInputBlocked(){return panelOpen||document.body.classList.contains('aux-open')||!$('warPanel').classList.contains('hidden')||!$('tutorial').classList.contains('hidden')||!$('victory').classList.contains('hidden')||quickBuildOpen;}
function hideAux(){
 closeNations();
 if(menuPausedSolo){pauseSolo=false;menuPausedSolo=false;}
 const closingContext=!$('contextCard').classList.contains('hidden');
 for(const id of AUX_IDS)$(id)?.classList.add('hidden');
 $('auxBackdrop')?.classList.add('hidden');document.body.classList.remove('aux-open');
 // Never reopen a dismissed object card on the next network tick.
 if(closingContext)selected=null;
}
function showAux(id){
 if(id==='armiesPanel'){openMilitary('army');return;}
 const el=$(id);if(!el)return;
 const wasOpen=!el.classList.contains('hidden');
 closeNations();setThreatList(false);
 if(attackPlanner)resetAttackPlanner();hideAux();if(wasOpen)return;
 if(id!=='contextCard')selected=null;
 toggleQuickBuild(false);setPreview(null);$('battleDock').classList.add('collapsed');
 if(panelOpen)closePanel();
 el.classList.remove('hidden');if(id==='armiesPanel')renderArmies();el.querySelector('button:not([disabled]):not(.hidden)')?.focus();$('auxBackdrop')?.classList.remove('hidden');document.body.classList.add('aux-open');
}

function name(){const val=$('nickname').value.trim().slice(0,18)||'Kingdom';try{localStorage.setItem('bk-name',val);}catch(_){ }return val;}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',v=new Uint8Array(6);crypto.getRandomValues(v);return Array.from(v,b=>chars[b%chars.length]).join('');}
function urlRoom(){return location.origin+location.pathname+'#'+code;}
function compress(arr){let chunks=[];for(let i=0;i<arr.length;i+=8192)chunks.push(String.fromCharCode(...arr.slice(i,i+8192)));return btoa(chunks.join(''));}
function expand(str){const raw=atob(str),out=new Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function rlePack(arr){const b=[];for(let i=0;i<arr.length;){const id=arr[i];let n=1;while(i+n<arr.length&&arr[i+n]===id&&n<65535)n++;b.push(id,n&255,n>>8);i+=n;}return compress(b);}
function rleUnpack(data){const a=expand(data),out=[];for(let i=0;i<a.length;i+=3){const id=a[i],n=a[i+1]+256*a[i+2];for(let j=0;j<n;j++)out.push(id);}return out;}
function pack(s,includeTerrain=true,viewerId=null){if(!s||!s.owners?.length)return s;return {...E.networkState(s,viewerId),tiles:includeTerrain?compress(s.tiles):null,owners:rlePack(s.owners),ownerRle:true,packed:true};}
function unpack(s){E.restoreNetworkState(s);if(s?.ownerDelta){const owners=state?.owners?.slice();if(!owners?.length)throw Error('Missing state for delta');for(let i=0;i<s.owners.length;i+=2)owners[s.owners[i]]=s.owners[i+1];s.owners=owners;s.tiles=state.tiles;delete s.ownerDelta;}if(s?.packed){s.tiles=s.tiles?expand(s.tiles):(state?.tiles||[]);s.owners=s.ownerRle?rleUnpack(s.owners):expand(s.owners);delete s.ownerRle;delete s.packed;}return s;}
function getPeer(){if(window.Peer)return true;error('PeerJS failed to load. Check your connection.');return false;}
function setBusy(v){for(const id of ['hostButton','joinButton','demoButton','resumeButton'])$(id).disabled=v;$('joinButton').textContent=v?'Connecting…':'Join';$('cancelConnect').classList.toggle('hidden',!v);}
function setNetwork(text){
 $('networkStatus').textContent=text;
 $('feedbackStatus').textContent=text==='SOLO'?'SOLO MATCH':'NETWORK · '+text;
 if(state?.phase==='playing'&&!$('game').classList.contains('hidden'))refreshHudAlert(mine());
}
function warnHud(text,kind='notice',action=null,seconds=6){hudNotice={text,kind,action,until:Date.now()+seconds*1000};refreshHudAlert(mine());}
function hostileAttacks(p){
 if(!state||!p||state.phase!=='playing')return [];
 return state.armies.filter(a=>a.strength>0&&a.owner!==myId&&a.targetOwner===myId&&!p.allies.includes(a.owner));
}
function focusThreat(a){
 if(!a)return;
 const tx=Math.max(0,Math.min(E.W-1,Math.round(a.x))),ty=Math.max(0,Math.min(E.H-1,Math.round(a.y)));
 hideAux();if(panelOpen)closePanel();
 const r=canvas.getBoundingClientRect();
 zoom=Math.max(.9,zoom);$('zoomText').textContent=Math.round(zoom*100)+'%';
 camX=r.width/2-(tx+.5)*TILE*zoom;
 camY=r.height/2-(ty+.5)*TILE*zoom;
 clampCamera();setPreview(null);queueDraw();
}
function threatDistance(a,p){
 const c=p?.capital;return c?Math.round(Math.hypot(a.x-c.x,a.y-c.y)):999;
}
function setThreatList(open){
 // The old floating list is replaced by the Military/Attacks tab.
 if(open)openMilitary('threats');
}

function updateIncomingAttack(p){
 const threats=hostileAttacks(p).sort((a,b)=>threatDistance(a,p)-threatDistance(b,p)||b.strength-a.strength);
 activeThreats=threats;
 $('threatExpand').classList.toggle('hidden',threats.length<2);
 if(!threats.length){lastThreatSignature='';threatBannerUntil=0;announcedThreats.clear();$('threatRail').classList.add('hidden');syncMilitaryThreats();return;}
 const attackers=[...new Set(threats.map(a=>a.owner))].map(id=>E.person(state,id)?.name||'Enemy');
 const force=threats.reduce((sum,a)=>sum+Math.max(0,a.strength),0);
 const signature=threats.map(a=>a.id).sort().join(',');
 $('incomingTitle').textContent=threats.length===1?'Under attack':`Under attack · ${threats.length} fronts`;
 $('incomingDetail').textContent=`${attackers.join(', ')} · ${number(force)} enemy troops`;
 $('threatCount').textContent=threats.length;
 $('incomingAttack').setAttribute('aria-label',threats.length>1?'View '+threats.length+' incoming attacks':'Go to attack location');
 const list=$('threatItems'),structure=threats.map(a=>a.id).join('|');
 if(list.dataset.structure!==structure){
  list.innerHTML=threats.map(a=>'<button type="button" data-focus-threat="'+esc(a.id)+'" class="threat-item"><i></i><span><strong></strong><small></small></span><b></b></button>').join('');
  list.dataset.structure=structure;
 }
 for(const [i,a] of threats.entries()){
  const node=list.querySelector('[data-focus-threat="'+a.id+'"]');if(!node)continue;
  const attacker=E.person(state,a.owner),distance=threatDistance(a,p);
  node.querySelector('i').style.background=attacker?.color||'#b94d40';
  node.querySelector('strong').textContent=attacker?.name||'Enemy';
  node.querySelector('small').textContent=number(a.strength)+' troops · '+(distance<999?'≈'+distance+' tiles from capital':'at border');
  node.querySelector('b').textContent=(i+1)+' ↗';
 }
 syncMilitaryThreats();
 if(signature!==lastThreatSignature){
  const fresh=threats.filter(a=>!announcedThreats.has(a.id));
  if(fresh.length){
   // Warn briefly on a NEW attack; persistent threat details live in Military.
   threatBannerUntil=Date.now()+9000;
   const name=E.person(state,fresh[0].owner)?.name||'Enemy';
   $('incomingAnnouncement').textContent=`Warning! ${name} is attacking your territory. Tap the alert to jump to the battle.`;
  }
  attackFocusIndex=0;
  announcedThreats=new Set(threats.map(a=>a.id));
  lastThreatSignature=signature;
 }
 $('threatRail').classList.toggle('hidden',Date.now()>=threatBannerUntil);
}
$('incomingAttack').onclick=()=>{if(activeThreats.length)openMilitary('threats');};
$('threatExpand').onclick=()=>openMilitary('threats');
$('threatClose').onclick=closeNations;
$('threatItems').onclick=e=>{
 const b=e.target.closest('[data-focus-threat]');if(!b)return;
 const a=activeThreats.find(a=>a.id===b.dataset.focusThreat);
 if(a){focusThreat(a);closeNations();}
};
function refreshHudAlert(p){
 const box=$('hudAlert');if(!box||!p||state?.phase!=='playing'){box?.classList.add('hidden');return;}
 let text='',kind='',action=null;
 const net=$('networkStatus')?.textContent||'';
 if(!host&&/RECONNECT|OFFLINE|DELAY|SYNC|SERVICE|CONNECT/.test(net)){text=`Connection unstable · last update ${Math.max(0,Math.floor((Date.now()-lastStateAt)/1000))}s ago. Orders unavailable.`;kind='danger';}
 if(!text&&p.capital&&!activeThreats.length){
  const cap=p.capital;
  const attackers=state.armies.some(a=>a.owner!==myId&&!p.allies.includes(a.owner)&&fighting(a.owner)&&a.targetOwner===myId&&Math.hypot(a.x-cap.x,a.y-cap.y)<9);
  if(attackers){text='Capital threatened · defend';kind='danger';action='capital';}
 }
 if(!text&&hudNotice&&Date.now()<hudNotice.until){text=hudNotice.text;kind=hudNotice.kind;action=hudNotice.action;}
 if(!text&&p.recruitment?.reason==='Food limits recruitment'){text='No food — recruitment stopped';kind='notice';action='build';}
 if(!text){box.classList.add('hidden');hudAlertAction=null;return;}
 box.classList.remove('hidden');box.classList.toggle('danger',kind==='danger');box.dataset.actionable=String(Boolean(action));
  // A notice without a destination is not a fake button.
  box.disabled=!action;box.setAttribute('aria-label',text+(action?' — open related location or panel':''));
  box.querySelector('.hud-alert-arrow')?.classList.toggle('hidden',!action);
 $('hudAlertIcon').textContent=kind==='danger'?'!':'i';$('hudAlertText').textContent=text;
 hudAlertAction=action;box.title=text+(action?' · tap to open':'');
}
$('hudAlert').onclick=()=>{
 if(hudAlertAction==='capital'){centerOnCapital();queueDraw();}
 else if(hudAlertAction==='build')toggleQuickBuild(true);
 else if(hudAlertAction==='armies'){showAux('armiesPanel');renderArmies();}
 else if(hudAlertAction&&typeof hudAlertAction==='object'){
  const {x,y}=hudAlertAction;camX=canvas.clientWidth/2-(x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(y+.5)*TILE*zoom;clampCamera();queueDraw();
 }
 else $('hudAlert').classList.add('hidden');
};
function updateHudSignals(p){
 const pendingIncome=p.troopIncome===undefined,counts=E.counts(state,myId),estimatedCap=Math.floor(900+p.land*2.4+counts.barracks*430+counts.city*260),cap=pendingIncome?estimatedCap:p.troopCap;
 const projected=Math.max(0,Math.min(cap-E.militaryStrength(state,p.id).total,Math.round(4+p.land/100+counts.barracks*5+counts.city*3+p.tech.war*2)));
 const growth=pendingIncome?Math.min(projected,Math.floor((p.res.food||0)/.20)):Math.floor(p.troopIncome||0),full=E.militaryStrength(state,p.id).total>=cap-.5,lowFood=Number(p.res.food||0)<1;
 let reason='';if(growth===0){reason=full?'FULL':lowFood?'NO FOOD':'NO RECRUITS';}
 if(pendingIncome){$('troopGrowth').textContent='≈+'+number(growth)+'/s';$('troopCap').textContent='/ '+number(cap);}
 const cause=$('troopReason');cause.textContent=reason;cause.classList.toggle('hidden',!reason);
 $('hudTroops').title=`Reserve: ${number(p.troops)} · Deployed: ${number(E.militaryStrength(state,p.id).deployed)} · Total capacity: ${number(cap)}. ${reason||`Recruitment: +${number(growth)} per second`}`;
 const share=p.land/Math.max(1,state.landTotal)*100;
 $('landCount').textContent=share.toFixed(1)+'%';
 $('landShare').textContent='goal 100%';
 $('landProgress').style.width=Math.max(0,Math.min(100,share)).toFixed(1)+'%';
 $('landCount').title=`Land: ${number(p.land)} of ${number(state.landTotal)} cells. To 100%: ${Math.max(0,100-share).toFixed(1)} pp`;
 $('frontCount').textContent=number([...(state.attackPlans||[]),...(state.recoveryPlans||[])].filter(p=>p.owner===myId).length);
 document.querySelector('.clock-stat')?.classList.remove('is-urgent');
 if(lastHudPlayer!==myId||state.tick<lastHudTick){lastHudPlayer=myId;lastHudLand=null;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";threatBannerUntil=0;}
 const currentArmies=new Map(state.armies.filter(a=>a.owner===myId).map(a=>[a.id,a]));
 if(lastHudLand!==null&&p.land<lastHudLand){
  let lost=null;
  if(lastHudOwners){for(let i=0;i<state.owners.length;i++)if(lastHudOwners[i]&&state.owners[i]!==myId){lost={x:i%E.W,y:Math.floor(i/E.W)};break;}}
  warnHud(`Lost ${number(lastHudLand-p.land)} cells`, 'danger',lost,7);
 }
 if(lastHudLand===null||state.territoryRevision!==updateHudSignals.lastRevision){
  lastHudOwners=Uint8Array.from(state.owners,v=>v===myId?1:0);updateHudSignals.lastRevision=state.territoryRevision;
 }
 lastHudLand=p.land;lastHudTick=state.tick;lastHudArmies=new Map([...currentArmies].map(([id,a])=>[id,{id,captured:a.captured,strength:a.strength}]));
 refreshHudAlert(p);
}

function getToken(){try{const storage=serverActive?localStorage:sessionStorage;let t=storage.getItem('bk-token-'+code);if(!t){t=crypto.randomUUID();storage.setItem('bk-token-'+code,t);}return t;}catch(_){return code+'-'+name();}}
function saveSolo(){if(!demo||!state||state.phase!=='playing'||mine()?.eliminated)return false;try{localStorage.setItem('bk-v14-save',JSON.stringify(state));return true;}catch(_){return false;}}
async function copyText(t){try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(t);toast('Copied');}catch(_){window.prompt('Copy the invite or code:',t);}}
function canPay(p,c){return Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);}
function deficit(p,c){return Object.entries(c||{}).filter(([k,v])=>(p.res[k]||0)<v).map(([k,v])=>({wood:'Wood',stone:'Stone',gold:'Gold',food:'Food'}[k]+': −'+(v-(p.res[k]||0)))).join(', ');}
function patchHtml(id,html){const el=$(id);if(el&&el.__last!==html){el.innerHTML=html;el.__last=html;}}
function inspectCell(x,y){if(!state||!E.inside(x,y))return;const id=E.owner(state,x,y),p=E.person(state,id),line=terrainNames[E.tile(state,x,y)]+' · '+(p?.name||'Unclaimed land')+' · '+x+','+y;$('mapStatus').textContent=line;$('mapStatusMobile').textContent=line;$('mapStatusMobile').classList.remove('hidden');}

// Tactical attack planner: outline a single contiguous enemy or neutral theatre.
const warPair=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
const fighting=id=>(state?.wars||[]).includes(warPair(myId,id));
function selectedNationTargets(){
 const me=mine();if(!me)return [0];
 const choices=Array.isArray(me.attackTargets)?me.attackTargets:
  [...new Set([...(state.attackPlans||[]),...(state.recoveryPlans||[])].filter(p=>p.owner===myId).flatMap(p=>p.targets??[p.targetOwner]).filter(id=>id>0))];
 return [0,...choices.filter(id=>id!==myId&&!me.allies.includes(id)&&E.person(state,id)?.land>0)];
}
function renderWars(){
 const me=mine(),chip=$('warChip');
 if(!state||!me)return;
 chip.classList.remove('hidden');
 const wars=(state.wars||[]).filter(k=>{const ids=k.split(':').map(Number);return ids.includes(myId)&&ids.every(id=>{const n=E.person(state,id);return n&&!n.eliminated&&n.land>0;});});
 const nations=state.players.filter(p=>p.id!==myId&&!p.eliminated&&p.land>0).sort((a,b)=>a.name.localeCompare(b.name));
 const incoming=(state.peaceOffers||[]).some(o=>o.to===myId)||nations.some(n=>(n.offers||[]).includes(myId));
 $('warChipLabel').textContent='NATIONS';
 $('nationWarCount').textContent=wars.length?(wars.length>9?'9+':String(wars.length)):'';
 $('nationWarCount').classList.toggle('hidden',!wars.length);
 chip.setAttribute('aria-label','Nations and diplomacy · '+wars.length+' wars'+(incoming?' · offers pending':''));
 chip.classList.toggle('nations-pending',incoming||activeThreats.length>0);
 chip.classList.toggle('nations-at-war',wars.length>0);
 const chosen=selectedNationTargets();
 const html=nations.map(n=>{
  const atWar=fighting(n.id),ally=me.allies.includes(n.id),targeted=chosen.includes(n.id);
  const peaceIn=(state.peaceOffers||[]).some(o=>o.from===n.id&&o.to===myId);
  const peaceOut=(state.peaceOffers||[]).some(o=>o.from===myId&&o.to===n.id);
  const allianceIn=(n.offers||[]).includes(myId),allianceOut=(me.offers||[]).includes(n.id);
  const status=ally?'ALLIED':atWar?'AT WAR':'PEACE';
  const relation=atWar?(peaceIn?'Accept peace':peaceOut?'Peace proposed':n.bot?'Request peace':'Propose peace'):
   ally?'End alliance':allianceIn?'Accept alliance':allianceOut?'Offer pending':n.bot?'Request alliance':'Offer alliance';
  const relationDisabled=atWar?peaceOut:(!ally&&allianceOut);
  const relationAction=atWar?'peace':'diplomacy';
  return '<div class="nation-row" data-nation-id="'+n.id+'"><div class="nation-identity"><span class="nation-color" style="background:'+esc(n.color)+'"></span>'+
   '<span class="nation-name">'+esc(n.name)+'</span><span class="nation-status '+(ally?'allied':atWar?'hostile':'neutral')+'">'+status+'</span></div>'+
   '<div class="nation-details" data-nation-land="'+n.id+'"></div>'+
   '<div class="nation-actions"><button type="button" class="nation-attack'+(targeted?' chosen':'')+'" data-nation-attack="'+n.id+
   '" aria-pressed="'+targeted+'" '+(ally?'disabled':'')+'>'+(ally?'Allied':targeted?'Stop attacks':'Attack')+'</button>'+
   '<button type="button" class="nation-diplomacy" data-nation-'+relationAction+'="'+n.id+'" '+
   (relationDisabled?'disabled':'')+'>'+relation+'</button></div></div>';
 }).join('')||'<p class="nation-empty">No other nations remain.</p>';
 patchHtml('warPanelList',html);
 for(const n of nations){const node=$('warPanelList').querySelector('[data-nation-land="'+n.id+'"]');if(node)node.textContent=number(n.land)+' cells';}
}
function resetAttackPlanner(){
 attackPlanner=null;planCancelArmy=null;
 $('game').classList.remove('plan-drawing','plan-reviewing');
 $('planGuide').classList.add('hidden');$('planReview').classList.add('hidden');$('planCancelDialog').classList.add('hidden');
 pressed.clear();gesture=null;pointerStart=null;
 $('planControls').classList.add('hidden');$('planControls').classList.remove('erase-only');$('planEraseHint').classList.add('hidden');
 $('planToolPaint').setAttribute('aria-pressed','false');$('planToolErase').setAttribute('aria-pressed','false');
 $('planToolPaint').classList.remove('chosen');$('planToolErase').classList.remove('chosen');queueDraw();
}
function selectedPlanIsland(cells,start){
 const pending=new Set(cells.filter(i=>state.tiles[i]&&state.owners[i]!==myId));
 if(!pending.has(start))return new Set(cells);
 const selected=new Set([start]),queue=[start];pending.delete(start);
 while(queue.length){
  const i=queue.pop(),x=i%E.W,y=(i/E.W)|0;
  for(const j of [x>0?i-1:-1,x<E.W-1?i+1:-1,y>0?i-E.W:-1,y<E.H-1?i+E.W:-1])
   if(pending.delete(j)){selected.add(j);queue.push(j);}
 }
 return selected;
}
function beginAttackPlanner(existing=null,resetCell=null){exitArmyFocus();
 if(!state||state.phase!=='playing'||mine()?.eliminated)return;
 hideAux();toggleQuickBuild(false);setPreview(null);buildMode=null;redirectArmy=null;selected=null;moveCursor=null;
 $('warPanel').classList.add('hidden');$('warChip').setAttribute('aria-expanded','false');
 pointerStart=null;gesture=null;pressed.clear();
 attackPlanner={mode:'paint',cells:new Set(existing?.zoneCells||[]),resetCells:existing?(resetCell===null?new Set(existing.zoneCells):selectedPlanIsland(existing.zoneCells,resetCell)):null,targets:new Set(selectedNationTargets()),editId:existing?.id||null,optionsKey:'',pointerId:null,lastPoint:null,brushPoint:null,zoneCells:null,brushRadius:2,tool:'paint',removedTargets:new Set(),originalCells:new Set(existing?.zoneCells||[]),originalTargets:new Set(selectedNationTargets()),originalPercent:existing?.percent??percent,touchLocked:false,strokeStart:null,strokeOrigin:null};
 if(existing){percent=existing.percent;$('attackPercent').value=String(percent);$('percentLabel').textContent=percent+'%';}
 $('planTroopsPercent').value=String(percent);$('planBrushSize').value='2';
 $('game').classList.add('plan-drawing');$('game').classList.remove('plan-reviewing');
 $('planGuide').classList.remove('hidden');$('planReview').classList.add('hidden');
 $('planControls').classList.remove('hidden');$('planControls').classList.remove('erase-only');$('planEraseHint').classList.add('hidden');
 $('planReviewButton').textContent=existing?'Save changes':'Start offensive';
 $('planPaintClear').textContent=existing?(resetCell===null?'Reset plan':'Reset region'):'Clear';
 setPaintTool('paint');
 $('planHeading').textContent=existing?'EDIT PLAN':'ATTACK PLAN';
 $('planGuide').setAttribute('aria-label','Attack plan controls');
 $('mapHint').classList.add('hidden');refreshPaintGuide();queueDraw();
}
// A brush paints cross-shaped five-tile stamps, keeping exactly one target owner.
function beginWorkPlanner(resource){
 beginAttackPlanner();if(!attackPlanner)return;
 const zone=(state.workZones||[]).find(z=>z.owner===myId&&z.resource===resource);
 attackPlanner.workResource=resource;attackPlanner.cells=new Set(zone?.zoneCells||[]);
 $('planHeading').textContent=nameResource[resource].toUpperCase()+' ZONE';
 $('planReviewButton').textContent='Save zone';
 $('planGuide').setAttribute('aria-label','Resource zone controls');refreshPaintGuide();queueDraw();
}
function beginGlobalEraser(){
 exitArmyFocus();
 if(!state||state.phase!=='playing'||mine()?.eliminated)return;
 hideAux();toggleQuickBuild(false);setPreview(null);setBuildingMode(null);
 pointerStart=null;gesture=null;pressed.clear();
 attackPlanner={mode:'erase',tool:'erase',cells:new Set(),erasable:new Set(),
  brushRadius:Number($('planBrushSize').value)||2,pointerId:null,lastPoint:null,brushPoint:null,
  strokeStart:null,strokeOrigin:null,touchLocked:false};
 $('game').classList.add('plan-drawing');$('game').classList.remove('plan-reviewing');
 $('planGuide').classList.add('hidden');$('planReview').classList.add('hidden');
 $('planControls').classList.remove('hidden');$('planControls').classList.add('erase-only');
 $('planEraseHint').classList.remove('hidden');
 $('planBrushValue').textContent=String(attackPlanner.brushRadius);
 $('mapHint').classList.add('hidden');
 setPaintTool('erase');refreshPaintGuide();queueDraw();
}
function togglePaintTool(tool){
 if(!attackPlanner){if(tool==='erase')beginGlobalEraser();else beginAttackPlanner();return;}
 if(attackPlanner.tool===tool){resetAttackPlanner();return;}
 resetAttackPlanner();if(tool==='erase')beginGlobalEraser();else beginAttackPlanner();
}
function setPaintTool(tool){
 const plan=attackPlanner;if(!plan)return;plan.tool=tool;
 $('planToolPaint').setAttribute('aria-pressed',String(tool==='paint'));
 $('planToolErase').setAttribute('aria-pressed',String(tool==='erase'));
 $('planToolPaint').classList.toggle('chosen',tool==='paint');$('planToolErase').classList.toggle('chosen',tool==='erase');queueDraw();
}
function syncPaintEligibility(plan){
 if(!plan||plan.mode!=='paint'||plan.workResource)return;
 const sources=[...(state.attackPlans||[]),...(state.recoveryPlans||[])].filter(p=>p.owner===myId&&p.id!==plan.editId);
 const allies=(mine()?.allies||[]).join(',');
 const same=plan.eligibilityAllies===allies&&plan.eligibilityRevision===state.territoryRevision&&plan.eligibilitySources?.length===sources.length&&sources.every((p,i)=>p.zoneCells===plan.eligibilitySources[i]);
 if(same)return;
 plan.blocked=new Set();for(const p of sources)for(const i of p.zoneCells||[])plan.blocked.add(i);
 for(const cells of [plan.cells,plan.originalCells])for(const i of cells)if(!state.tiles[i]||state.owners[i]===myId||(mine()?.allies||[]).includes(state.owners[i])||plan.blocked.has(i))cells.delete(i);
 plan.eligibilityAllies=allies;plan.eligibilityRevision=state.territoryRevision;plan.eligibilitySources=sources.map(p=>p.zoneCells);
}
function brushAt(pt){
 const plan=attackPlanner;if(!plan||!['paint','erase'].includes(plan.mode))return;
 syncPaintEligibility(plan);const radius=plan.brushRadius,limit=plan.strokeLimit??Math.max(E.planCellLimit(state,myId),plan.editId?plan.originalCells.size:0);
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(dx*dx+dy*dy>radius*radius)continue;
  const x=pt.x+dx,y=pt.y+dy;if(!E.inside(x,y)||!E.tile(state,x,y))continue;
  const cell=y*E.W+x;
  if(plan.workResource&&!E.workSuitable(state,myId,plan.workResource,cell))continue;
  if(plan.mode==='erase'){if(plan.erasable.has(cell))plan.cells.add(cell);continue;}
  if(plan.tool==='erase'){plan.cells.delete(cell);continue;}
  if((mine()?.allies||[]).includes(state.owners[cell])||state.owners[cell]===myId||plan.blocked?.has(cell)||plan.cells.has(cell)||plan.cells.size>=limit)continue;
  plan.cells.add(cell);
 }
}
// Interpolate missing pointer events so quick drags stay continuous.
function paintLine(from,to){
 const dx=Math.abs(to.x-from.x),dy=Math.abs(to.y-from.y),sx=from.x<to.x?1:-1,sy=from.y<to.y?1:-1;
 let x=from.x,y=from.y,err=dx-dy;
 for(let n=0;n<=E.W+E.H+8;n++){
  brushAt({x,y});if(x===to.x&&y===to.y)break;
  const e2=2*err;if(e2>-dy){err-=dy;x+=sx;}if(e2<dx){err+=dx;y+=sy;}
 }
}
function paintAtPointer(pt){
 const plan=attackPlanner;if(!plan||!['paint','erase'].includes(plan.mode))return;
 syncPaintEligibility(plan);plan.strokeLimit=Math.max(E.planCellLimit(state,myId),plan.editId?plan.originalCells.size:0);plan.brushPoint=pt;
 if(plan.lastPoint)paintLine(plan.lastPoint,pt);else brushAt(pt);
 plan.lastPoint=pt;
}
function checkPaintZone(plan){
 if(!plan?.cells?.size)return {error:'Paint land to begin.'};
 const cells=[...plan.cells].sort((a,b)=>a-b);
 if(!cells.length)return {error:'Paint at least one land cell.'};
 if(cells.some(i=>!Number.isInteger(i)||i<0||i>=E.W*E.H||!state.tiles[i]))return {error:'Only land can be planned.'};
 return {cells};
}
function overlappingPlans(plan){
 return (state.attackPlans||[]).filter(p=>p.owner===myId&&p.id!==plan.editId&&p.zoneCells.some(i=>plan.cells.has(i)));
}
function refreshPaintTargets(plan){plan.targets=new Set(selectedNationTargets());}
function refreshPaintGuide(){
 planningVisualCache=null;
 const plan=attackPlanner;if(plan?.mode==='erase'){$('eraseCount').textContent=number(plan.cells.size)+' cells';$('eraseApply').disabled=!plan.cells.size;$('eraseReset').disabled=!plan.cells.size;return;}if(plan?.mode!=='paint')return;syncPaintEligibility(plan);
 const checked=checkPaintZone(plan),count=plan.cells.size;
 if(plan.workResource){
  const stats=E.workforceStats(state,myId);
  $('planPaintCount').textContent=number(count)+' cells';$('planPaintClear').disabled=pressed.size>0||!count;
  $('planReviewButton').disabled=pressed.size>0;$('planBrushValue').textContent=String(plan.brushRadius);
  $('planGuideHint').textContent=number(stats.capacity)+' workers · Paint suitable own land · Eraser removes · Two fingers move';
  return;
 }
 refreshPaintTargets(plan);
 const selected=selectedNationTargets(),permitted=[...plan.cells].filter(i=>selected.includes(state.owners[i])).length;
 const protectedCount=[...plan.cells].filter(i=>state.owners[i]!==myId&&!selected.includes(state.owners[i])).length;
 const overlap=overlappingPlans(plan).length;
 $('planPaintCount').textContent=number(count)+' cells';
 $('planPaintClear').disabled=pressed.size>0||(!plan.editId&&!count);
 $('planReviewButton').disabled=count===0||pressed.size>0;
 $('planBrushValue').textContent=String(plan.brushRadius);
 $('planTroopsValue').textContent=percent+'%';
 $('planGuideHint').textContent=checked.error||
  (overlap?'Merges with '+overlap+' plan'+(overlap!==1?'s':'')+' · ':'')+
  (protectedCount?number(protectedCount)+' protected · ':'')+
  'Targets in Nations · '+number(permitted)+' permitted · automatic local advance';
}
function clearPaintedZone(){
 const plan=attackPlanner;if(plan?.mode!=='paint'||pressed.size>0)return;
 if(plan.editId&&!plan.workResource){
  if(command({type:'erasePlanCells',cells:[...plan.resetCells]})){resetAttackPlanner();toast('Selected offensive region removed');}
  return;
 }
 plan.cells.clear();
 plan.lastPoint=null;plan.brushPoint=null;plan.zoneCells=null;plan.optionsKey='';
 refreshPaintGuide();queueDraw();
}
function reviewPaintedZone(){
 const plan=attackPlanner;if(plan?.mode!=='paint'||pressed.size>0)return;
 if(plan.workResource){if(command({type:'workZone',resource:plan.workResource,cells:[...plan.cells]})){resetAttackPlanner();toast('Work zone saved');}return;}
 const checked=checkPaintZone(plan);if(checked.error){refreshPaintGuide();toast(checked.error,'error');return;}
 const targets=selectedNationTargets();
 const foreign=checked.cells.find(i=>state.owners[i]!==myId)??checked.cells[0];
 const order=plan.editId?
  {type:'updatePlan',id:plan.editId,zone:checked.cells,targets,excludeTargets:[...plan.removedTargets]}:
  {type:'send',x:foreign%E.W,y:(foreign/E.W)|0,zone:checked.cells,targets,excludeTargets:[...plan.removedTargets]};
 if(command(order)){resetAttackPlanner();toast(plan.editId?'Offensive plan updated':'Offensive plan created');}
}
function editPaintedZone(){
 const plan=attackPlanner;if(plan?.mode!=='review')return;
 plan.mode='paint';plan.zoneCells=null;plan.pointerId=null;plan.lastPoint=null;
 $('game').classList.add('plan-drawing');$('game').classList.remove('plan-reviewing');
 $('planGuide').classList.remove('hidden');$('planReview').classList.add('hidden');
 refreshPaintGuide();queueDraw();
}
function refreshPlanReview(){
 const plan=attackPlanner;if(plan?.mode!=='review')return;
 const other=E.person(state,plan.targetOwner),war=!!other&&fighting(plan.targetOwner);
 const sent=Math.floor((mine()?.troops||0)*percent/100),remaining=(mine()?.troops||0)-sent;
 $('planTarget').textContent=other?.name||'Unclaimed territory';
 $('planAreaCount').textContent=number(plan.zoneCells?.length||0)+' cells';
 const status=$('planStatus');status.textContent=war?'WAR ACTIVE':other?'WAR DECLARATION':'UNCLAIMED';status.classList.toggle('at-war',!!other&&!war);
 $('planDescription').textContent=other&&!war?'Confirming will declare war on '+other.name+'. Captures will advance only inside the outline.':
  other?'War is already active. Troops will advance only through the marked zone.':
  'Your army will gradually claim the marked neutral land. No troops move before confirmation.';
 $('planForceLabel').textContent='AUTO';
 $('planForceDetails').textContent='Ready sectors advance independently. Troops and defensive reserves are assigned automatically.';
 const btn=$('planLaunch');btn.textContent=other&&!war?'Declare war & attack':'Start offensive';
 btn.classList.toggle('declare-war',!!other&&!war);
 btn.disabled=!plan.zoneCells?.length;
 for(const b of document.querySelectorAll('[data-plan-percent]'))b.classList.toggle('active',Number(b.dataset.planPercent)===percent);
}
function openCancelPlan(item){
 if(!item||item.owner!==myId)return;
 planCancelArmy=item.id;
 const planned=(state.attackPlans||[]).some(p=>p.id===item.id);
 $('planCancelTitle').textContent=planned?'Cancel this offensive plan?':'Recall this offensive?';
 $('planCancelDescription').textContent=planned
  ?'The marked area will be removed. Any active troops return with the withdrawal cost; no further waves will be sent.'
  :'The advance stops. Surviving troops return with the withdrawal cost.';
 $('planCancelYes').textContent=planned?'Cancel plan':'Recall army';
 $('planCancelDialog').classList.remove('hidden');$('planCancelNo').focus();
}
let planningVisualCache=null;
function drawAttackPlanning(){
 // Union all saved and in-progress zones before tracing boundaries. A newly
 // painted stroke above an old plan has exactly one contour, never two seams.
 const sources=[...(state.attackPlans||[]),...(state.recoveryPlans||[]),...state.armies.filter(a=>a.strength>0&&!a.planId&&Array.isArray(a.zoneCells))].filter(p=>p.owner===myId);
 const visualKey=(attackPlanner?.editId||'')+'|'+(mine()?.allies||[]).join(',')+'|'+state.territoryRevision+'|'+sources.map(p=>p.id+':'+(p.targets||[p.targetOwner]).join(',')+':'+state.armies.some(a=>a.planId===p.id)).join('|');
 if(planningVisualCache&&(planningVisualCache.visualKey!==visualKey||sources.length!==planningVisualCache.sources.length||sources.some((p,i)=>p.zoneCells!==planningVisualCache.sources[i])))
  planningVisualCache=null;
 const visual=planningVisualCache||new Map(),editId=attackPlanner?.mode==='paint'?attackPlanner.editId:null;
 if(!planningVisualCache){
 const collect=(plan,preview=false,recovery=false)=>{
  const eligible=new Set(plan.targets??[plan.targetOwner]);
  for(const i of plan.zoneCells||[]){
   if(!state.tiles[i]||(mine()?.allies||[]).includes(state.owners[i])||state.owners[i]===myId&&!preview)continue;
   let cell=visual.get(i);
   if(!cell){cell={targets:new Set(),preview:false,recovery:false,waiting:true};visual.set(i,cell);}
   for(const target of eligible)cell.targets.add(target);
   cell.preview||=preview;cell.recovery||=recovery;
   if(!plan.waiting)cell.waiting=false;
  }
 };
 for(const plan of (state.attackPlans||[]).filter(p=>p.owner===myId)){
  if(editId===plan.id)continue;
  collect({...plan,waiting:!state.armies.some(a=>a.planId===plan.id)});
 }
 for(const plan of (state.recoveryPlans||[]).filter(p=>p.owner===myId))
  collect({...plan,waiting:!state.armies.some(a=>a.planId===plan.id)},false,true);
 for(const army of state.armies.filter(a=>a.owner===myId&&a.strength>0&&Array.isArray(a.zoneCells)&&!a.planId))
  collect(army);
 if(attackPlanner?.mode==='review'&&attackPlanner.zoneCells)
  collect({zoneCells:attackPlanner.zoneCells,targets:[attackPlanner.targetOwner]},true);

 visual.visualKey=visualKey;visual.sources=sources.map(p=>p.zoneCells);planningVisualCache=visual;
 }
 const left=Math.max(0,Math.floor(-camX/(TILE*zoom))-2),right=Math.min(E.W-1,Math.ceil((canvas.clientWidth-camX)/(TILE*zoom))+2),
  top=Math.max(0,Math.floor(-camY/(TILE*zoom))-2),bottom=Math.min(E.H-1,Math.ceil((canvas.clientHeight-camY)/(TILE*zoom))+2);
 const T=TILE,hasPreview=[...visual.values()].some(v=>v.preview);
 if(visual.size){
  ctx.save();
  ctx.strokeStyle='#ffef79';
  ctx.lineWidth=Math.max(1.15,1.9/zoom);
  if(!hasPreview)ctx.setLineDash([4/zoom,5/zoom]);
  ctx.beginPath();
  for(const [i,cell] of visual){
   const x=i%E.W,y=(i/E.W)|0;
   if(x<left||x>right||y<top||y>bottom)continue;
   const permitted=cell.targets.has(state.owners[i]);
   ctx.fillStyle=!permitted?'rgba(134,149,166,.085)':
    cell.preview?'rgba(255,234,72,.35)':
    cell.recovery?'rgba(255,174,115,.23)':
    cell.waiting?'rgba(255,224,65,.20)':'rgba(255,224,65,.24)';
   ctx.fillRect(x*T,y*T,T,T);
   if(!visual.has(i-E.W)){ctx.moveTo(x*T,y*T);ctx.lineTo((x+1)*T,y*T);}
   if(!visual.has(i+E.W)){ctx.moveTo(x*T,(y+1)*T);ctx.lineTo((x+1)*T,(y+1)*T);}
   if(x===0||!visual.has(i-1)){ctx.moveTo(x*T,y*T);ctx.lineTo(x*T,(y+1)*T);}
   if(x===E.W-1||!visual.has(i+1)){ctx.moveTo((x+1)*T,y*T);ctx.lineTo((x+1)*T,(y+1)*T);}
  }
  ctx.strokeStyle='#121722';ctx.lineWidth=4/zoom;ctx.stroke();ctx.strokeStyle='#fff39c';ctx.lineWidth=1.8/zoom;ctx.stroke();ctx.restore();
 }
 if(attackPlanner?.mode==='paint'&&!attackPlanner.workResource&&attackPlanner.cells.size){
  ctx.save();ctx.fillStyle='rgba(255,233,65,.4)';ctx.strokeStyle='#fff39c';ctx.lineWidth=1.8/zoom;ctx.beginPath();
  const cells=attackPlanner.cells;
  for(const i of cells){const x=i%E.W,y=(i/E.W)|0;if(x<left||x>right||y<top||y>bottom)continue;
   ctx.fillRect(x*T,y*T,T,T);
   if(!cells.has(i-E.W)){ctx.moveTo(x*T,y*T);ctx.lineTo((x+1)*T,y*T);}
   if(!cells.has(i+E.W)){ctx.moveTo(x*T,(y+1)*T);ctx.lineTo((x+1)*T,(y+1)*T);}
   if(x===0||!cells.has(i-1)){ctx.moveTo(x*T,y*T);ctx.lineTo(x*T,(y+1)*T);}
   if(x===E.W-1||!cells.has(i+1)){ctx.moveTo((x+1)*T,y*T);ctx.lineTo((x+1)*T,(y+1)*T);}
  }ctx.stroke();ctx.restore();
 }
 if(attackPlanner?.mode==='erase'&&attackPlanner.cells.size){
  ctx.save();ctx.fillStyle='rgba(255,158,109,.44)';
  for(const i of attackPlanner.cells){const x=i%E.W,y=(i/E.W)|0;
   if(x>=left&&x<=right&&y>=top&&y<=bottom)ctx.fillRect(x*T,y*T,T,T);}
  ctx.restore();
 }
 if(attackPlanner?.workResource){ctx.save();ctx.fillStyle='#e9d6a044';for(const i of attackPlanner.cells)ctx.fillRect(i%E.W*TILE,((i/E.W)|0)*TILE,TILE,TILE);ctx.restore();}
 const brush=(attackPlanner?.mode==='paint'||attackPlanner?.mode==='erase')&&attackPlanner.brushPoint;
 if(brush&&E.inside(brush.x,brush.y)){
  ctx.save();ctx.beginPath();ctx.arc((brush.x+.5)*T,(brush.y+.5)*T,T*(attackPlanner.brushRadius+.5),0,Math.PI*2);
  ctx.fillStyle=attackPlanner.tool==='erase'?'rgba(255,155,114,.15)':'rgba(103,223,255,.12)';
  ctx.strokeStyle=attackPlanner.tool==='erase'?'#ffab87':'#b1f1ff';ctx.lineWidth=Math.max(1,1.6/zoom);
  ctx.fill();ctx.stroke();ctx.restore();
 }
}
function setPreview(t){
 target=t;const box=$('targetPreview');box.classList.toggle('hidden',!t);$('game').classList.toggle('is-targeting',!!t);
 if(!t){queueDraw();return;}
 const owner=E.owner(state,t.x,t.y),enemy=E.person(state,owner),p=mine(),sent=t.type==='redirect'?(state.armies.find(a=>a.id===redirectArmy)?.strength||0):0;
 const front=E.previewFront(state,myId,t.x,t.y),sea=E.tile(state,t.x,t.y)===0;
 const allied=!!enemy&&p.allies.includes(owner),received=!!enemy&&enemy.offers.includes(myId),sentOffer=!!enemy&&p.offers.includes(owner);
 const war=!!enemy&&fighting(owner),diplomatic=t.type==='send'&&!!enemy&&!war,offerButton=$('targetDiplomacy');
 const peace=$('targetPeace'),receivedPeace=(state.peaceOffers||[]).some(o=>o.from===owner&&o.to===myId),sentPeace=(state.peaceOffers||[]).some(o=>o.from===myId&&o.to===owner);
 peace.classList.toggle('hidden',!war||t.type!=='send');peace.disabled=!war||!!enemy?.bot||sentPeace;
 peace.textContent=receivedPeace?'Accept peace treaty':sentPeace?'Peace proposal sent':enemy?.bot?'Bots do not sign peace':'Propose peace';
 offerButton.classList.toggle('hidden',!diplomatic);
 offerButton.disabled=!diplomatic||(!allied&&(sentOffer||!!enemy?.bot));
 offerButton.textContent=allied?(t.confirmBreak?'Confirm end alliance':'End alliance'):received?'Accept alliance offer':sentOffer?'Offer sent':enemy?.bot?'Bots do not accept alliances':'Offer alliance';
 box.dataset.diplomacy=allied?'allied':received?'received':sentOffer?'sent':enemy?.bot?'bot':'offer';
 const candidate=E.buildingAt(state,t.x,t.y),building=candidate&&E.visibleBuilding(state,myId,candidate)?candidate:null;
 $('targetTitle').textContent=t.type==='redirect'?'Redirect offensive':allied?'Ally: '+enemy.name:enemy?'Diplomacy · '+enemy.name:'No foreign kingdom';
 $('targetDetail').textContent=t.type==='redirect'?`${number(sent)} troops · reserve ${number(p.troops)} · ${terrainNames[E.tile(state,t.x,t.y)]}`:`${terrainNames[E.tile(state,t.x,t.y)]}${building?' · '+(E.KINDS[building.kind]?.name||'Capital'):''} · Alliances and peace`;
 const defense=enemy?Math.round(E.tileDefense(state,owner,t.x,t.y)):0;const averageDefense=enemy&&front.cells.length?Math.round(front.cells.reduce((sum,i)=>sum+E.tileDefense(state,owner,i%E.W,Math.floor(i/E.W)),0)/front.cells.length):0;
 $('targetForecast').textContent=allied?'Allied territory cannot be attacked. End the alliance first.':
   t.type==='redirect'?'Confirm to redirect your army.':
   sea?'Sea is impassable. Choose land.':
   owner?(war?'War is active. Paint a target area to start a new advance.':'Paint a connected attack area. The first confirmed attack declares war.'):
   'Brush over neutral land connected to your border, then review and confirm.';
 $('confirmTarget').textContent=t.type==='redirect'?'Change target':'Paint attack zone';
 $('confirmTarget').disabled=allied;
 if(t.type==='redirect'&&!allied&&p.troops<Math.max(75,Math.min(300,p.troopCap*.12)))$('targetForecast').textContent+=' Warning: your reserve will be low after this order.';
 box.dataset.order=t.type;$('cancelTarget').textContent=t.type==='redirect'?'Cancel':'Close';
 const projectedY=(t.y+.5)*TILE*zoom+camY,available=canvas.clientHeight-Math.min(270,Math.max(155,canvas.clientHeight*.37));
 if(t.type==='redirect'&&projectedY>available){camY-=projectedY-available+18;clampCamera();}
 document.querySelectorAll('[data-target-percent]').forEach(b=>{const on=Number(b.dataset.targetPercent)===percent;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 queueDraw();
}
function contextual(item){
 const box=$('contextCard'),content=$('contextBody');if(!item){if(!box.classList.contains('hidden'))hideAux();return;}
 const me=mine(),own=item.owner===myId,other=E.person(state,item.owner);let html='';
 if(item.kind&&item.kind!=='army'){
  const details=buildingInfo[item.kind],cost=E.costUpgrade(item),maxed=item.level>=4,upgrading=item.upgrade;
  const upgradeJob=upgrading&&(state.buildJobs||[]).find(j=>j.id===upgrading.jobId);
  const upgradeWorker=upgrading&&(me.workers||[]).find(g=>g.job===upgrading.jobId);
  const progress=upgradeJob?.progress??upgrading?.progress??0,total=upgrading?.total||E.upgradeTime(item);
  const buildState=!upgradeWorker?'Waiting for builders':upgradeWorker.x===item.x&&upgradeWorker.y===item.y?'Builders working':'Builders travelling';
  const effect=details?buildingBenefit(item.kind,me,item.level):'Capital defense improves at each level';
  const next=details?buildingBenefit(item.kind,me,item.level+1):'Capital defense will increase';
  const stationed=own&&['capital','city','barracks'].includes(item.kind)?(me.garrisons||[]).filter(c=>!c.returning&&(!Number.isFinite(c.tx)||c.x===c.tx&&c.y===c.ty)&&Math.abs(c.x-item.x)+Math.abs(c.y-item.y)<=2).reduce((n,c)=>n+c.strength,0):null;
  html=`<div class="context-heading"><strong><img class="context-building-art" src="${buildingRoofUrl(item.kind,item.owner,item.level)}" alt="" aria-hidden="true"/>${esc(E.KINDS[item.kind]?.name||'Capital')} · lvl. ${item.level}</strong><small>${esc(other?.name||'')}</small></div>
   <div class="context-effect"><small>Current</small><span>${esc(effect)}</span></div>
   ${own&&item.kind==='fort'?`<div class="context-effect"><small>Scouting range</small><span>${E.fortRadius(item,state)} tiles · ${esc(terrainNames[E.tile(state,item.x,item.y)])}</span></div>`:''}
   ${stationed===null?'':`<div class="context-effect"><small>Garrison nearby</small><span>${number(stationed)} troops</span></div>`}
   ${maxed?'':`<div class="context-effect context-effect-next"><small>After upgrade</small><span>${esc(next)}</span></div>`}
   ${own&&upgrading?`<div class="context-effect"><small>Upgrading to level ${upgrading.level}</small><span>${buildState} · ${Math.floor(progress)}/${total} work · current output until complete</span></div>`:own&&!maxed?`<div class="context-upgrade-price"><small>Upgrade cost</small><div>${briefCost(cost)}</div></div><button data-context-upgrade="${esc(item.id)}" ${!canPay(me,cost)?'disabled':''}>Assign builders · ${E.upgradeTime(item)} work</button>${!canPay(me,cost)?`<small class="context-shortage">Missing: ${deficit(me,cost)}</small>`:''}`:own?'<small>Maximum level</small>':''}`;

 }else html=`<strong>Army · ${esc(other?.name||'')}</strong><span>${number(item.strength)} troops · ${item.tx},${item.ty}</span>${own?`${!Array.isArray(item.zoneCells)?`<button data-context-redirect="${esc(item.id)}">Change target</button>`:''}<button data-context-return="${esc(item.id)}">Retreat</button>`:''}`;
 if(content.__last!==html){content.innerHTML=html;content.__last=html;}if(box.classList.contains('hidden'))showAux('contextCard');
}
let serverSocket=null,serverActive=false,serverSession=0,serverHeartbeat=null,serverJoinToken=null;
function serverEnabled(){return window.BK_SERVER===true;}
function serverSend(m){if(serverSocket?.readyState===1){serverSocket.send(JSON.stringify(m));return true;}return false;}
async function createServerRoom(){
 const session=++serverSession;serverActive=true;demo=false;host=false;setBusy(true);setNetwork('CONNECTING');
 try{
  const token=crypto.randomUUID();
  const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name(),token})});
  if(!response.ok)throw Error('Server unavailable. Try again.');
  const room=await response.json();if(session!==serverSession)return;
  code=room.code;serverJoinToken=token;
  try{localStorage.setItem('bk-token-'+code,token);}catch(_){}
  openServerSocket(session);
 }catch(e){if(session===serverSession){serverActive=false;setBusy(false);error(e.message);}}
}
function joinServerRoom(){
 const entered=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!/^[A-F0-9]{6}$/.test(entered))return error('Enter a six-character server room code.');
 code=entered;serverJoinToken=null;serverActive=true;demo=false;host=false;setBusy(true);openServerSocket(++serverSession);
}
function openServerSocket(session=serverSession){
 if(!serverActive||session!==serverSession)return;
 clearTimeout(connectTimer);clearTimeout(reconnectTimer);clearInterval(serverHeartbeat);
 const old=serverSocket;serverSocket=null;try{old?.close();}catch(_){}
 const url=new URL('/api/rooms/'+code+'/socket',location.origin);url.protocol=location.protocol==='https:'?'wss:':'ws:';
 const ws=new WebSocket(url);serverSocket=ws;setNetwork('CONNECTING');
 connectTimer=setTimeout(()=>{if(serverSocket===ws)ws.close();},15000);
 ws.onopen=()=>{if(serverSocket!==ws)return;serverSend({t:'join',token:serverJoinToken||getToken(),name:name()});};
 ws.onmessage=event=>{
  if(serverSocket!==ws||session!==serverSession)return;
  let m;try{m=JSON.parse(event.data);}catch(_){return;}
  if(m.t==='welcome'||m.t==='state'){
   if(m.t==='welcome'){myId=m.id;reconnectTries=0;clearTimeout(connectTimer);setBusy(false);try{history.replaceState(null,'','#'+code);}catch(_){}}
   oldArmyPositions=new Map((state?.armies||[]).map(a=>[a.id,{x:a.x,y:a.y}]));movementStart=performance.now();
   const oldPhase=state?.phase;state=unpack(m.state);host=state.serverAdmin===myId;lastStateAt=Date.now();
   if(state.phase==='lobby'&&oldPhase!=='lobby'){phaseShown='';worldLayer=null;pixelLayer=null;paintedRevision=-1;defeatDismissed=false;hideAux();closePanel();cancelMode();}
   setNetwork('SERVER');render();
  }else if(m.t==='ack'){
   pendingOrders.delete(m.id);toast(m.ok?'Order completed':m.error||'Order rejected',m.ok?'success':'error');
   if(m.ok&&m.action==='build')refreshQuickBuild();
  }else if(m.t==='error'){clearTimeout(connectTimer);setBusy(false);if(!state){error(m.message);serverActive=false;ws.close();}else{toast(m.message,'error');if(state.phase==='lobby'){$('spawnHint').textContent=m.message;$('spawnHint').dataset.kind='error';}}}
 };
 ws.onclose=()=>{
  if(serverSocket!==ws||session!==serverSession||!serverActive)return;
  clearTimeout(connectTimer);setNetwork('RECONNECTING');
  if(++reconnectTries>8){setBusy(false);if(state)toast('Server unavailable. Use Reconnect to try again.');else error('Could not join the room. Check the code.');return;}
  reconnectTimer=setTimeout(()=>openServerSocket(session),Math.min(12000,1000*reconnectTries));
 };
 ws.onerror=()=>{};
 serverHeartbeat=setInterval(()=>{if(serverSocket===ws)serverSend({t:'ping'});},15000);
}
function leaveServer(){
 serverActive=false;serverJoinToken=null;++serverSession;clearInterval(serverHeartbeat);serverHeartbeat=null;
 const ws=serverSocket;serverSocket=null;try{ws?.close(1000,'Left room');}catch(_){}
}

function createRoom(){if(serverEnabled())return createServerRoom();if(!getPeer())return;setBusy(true);code=randomCode();host=true;demo=false;readyLocal=true;peer=new Peer('bk-'+code);const sessionPeer=peer;setNetwork('CONNECTING');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Could not create room. Try again.');try{peer.destroy();}catch(_){}}},12000);
 peer.on('open',()=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);state=E.lobby(Date.now());myId=E.addPlayer(state,name());state.players[0].ready=true;state.settings={bots:Number($('botCount').value)};setNetwork('HOST');try{history.replaceState(null,'','#'+code);}catch(_){}phaseShown='';render();});
 peer.on('connection',c=>{if(peer===sessionPeer)joinConnection(c);});peer.on('error',e=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);error('Room: '+(e.message||e.type||'error'));});
 peer.on('disconnected',()=>{if(peer===sessionPeer)setNetwork('SERVICE UNAVAILABLE');});
}
function joinRoom(){if(serverEnabled())return joinServerRoom();if(!getPeer())return;code=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);if(!/^[A-Z0-9]{6}$/.test(code))return error('Enter a six-character room code.');$('lobbyError').textContent='';setBusy(true);host=false;demo=false;peer=new Peer();const sessionPeer=peer;setNetwork('CONNECTING');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Room not responding. Check the code.');try{peer.destroy();}catch(_){}}},14000);
 peer.on('open',()=>{if(peer===sessionPeer)connectUpstream();});peer.on('error',e=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);error('Connection: '+(e.message||e.type||'error'));});
}
function connectUpstream(){if(!peer||peer.destroyed)return;upstream=peer.connect('bk-'+code,{reliable:true});const activeConnection=upstream;
 upstream.on('open',()=>{if(upstream!==activeConnection)return;upstream.send({t:'join',name:name(),token:getToken()});});
 upstream.on('data',m=>{if(upstream!==activeConnection)return;if(!m||typeof m!=='object')return;if(m.t==='room-closed'){goHome();error('Host closed the room. Create or join another.');return;}if(m.t==='welcome'){clearTimeout(connectTimer);setBusy(false);reconnectTries=0;myId=m.id;state=unpack(m.state);lastStateAt=Date.now();phaseShown=state.phase==='playing'?'':phaseShown;setNetwork('ONLINE');render();}else if(m.t==='state'){if(m.state?.ownerDelta&&m.state.ownerBaseRev!==state?.territoryRevision){upstream.send({t:'resync'});setNetwork('SYNCING');return;}const before=state?.armies||[];oldArmyPositions=new Map(before.map(a=>[a.id,{x:a.x,y:a.y}]));movementStart=performance.now();state=unpack(m.state);lastStateAt=Date.now();setNetwork('ONLINE');render();}else if(m.t==='ack'){pendingOrders.delete(m.id);toast(m.ok?'Order completed':m.error||'Order rejected');if(m.ok&&m.action==='build'){toast('Construction queued');refreshQuickBuild();}}else if(m.t==='error'){clearTimeout(connectTimer);setBusy(false);if(!state)error(m.message);else toast(m.message);}});
 upstream.on('close',()=>{if(upstream!==activeConnection)return;setNetwork('RECONNECTING');retryUpstream();});upstream.on('error',()=>{if(upstream!==activeConnection)return;setNetwork('OFFLINE');});
}
function retryUpstream(){if(serverActive)return openServerSocket();if(host||demo||!peer||peer.destroyed)return;clearTimeout(reconnectTimer);if(++reconnectTries>8){setNetwork('OFFLINE');toast('Host not responding. The host must keep their tab open.');return;}reconnectTimer=setTimeout(connectUpstream,Math.min(12000,1000*reconnectTries));}
function joinConnection(conn){const sessionPeer=peer;conn.on('data',m=>{if(peer!==sessionPeer)return;if(!m||typeof m!=='object')return;
 if(m.t==='join'){
  if(connections.has(conn))return;
  let id=tokenStore.get(m.token);const old=state.players.find(p=>p.id===id);
  if(!old||old.bot){if(state.phase!=='lobby'){conn.send({t:'error',message:'Match already started. Rejoin from your previous device.'});return;}id=E.addPlayer(state,m.name);if(!id){conn.send({t:'error',message:'Room is full.'});return;}}
  if(m.token)tokenStore.set(m.token,id);
  for(const [c,v] of connections)if(v===id&&c!==conn){connections.delete(c);previousOwners.delete(c);previousRevs.delete(c);try{c.close();}catch(_){ }}
  state.players.find(p=>p.id===id).connected=true;state.players.find(p=>p.id===id).ready=true;connections.set(conn,id);conn.send({t:'welcome',id,state:pack(state,true,id)});previousOwners.delete(conn);previousRevs.delete(conn);broadcast(false);
 }else if(m.t==='resync'){conn.send({t:'state',state:pack(state,true,connections.get(conn))});previousOwners.set(conn,state.owners.slice());previousRevs.set(conn,state.territoryRevision);}else if(m.t==='spawn'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){const result=E.setSpawn(state,id,m.point===null?null:m.point);if(result.ok)broadcast();else conn.send({t:'error',message:result.error});}}else if(m.t==='ready'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){p.ready=!!m.value;broadcast();}}
 else if(m.t==='settings'){/* only the room host may edit settings */}
 else if(m.t==='action'){
  const id=connections.get(conn);if(!id)return;const now=Date.now();if(now-(lastSendTime.get(conn)||0)<75)return;
  lastSendTime.set(conn,now);const result=E.action(state,id,m.action);conn.send({t:'ack',id:m.id,ok:result.ok,error:result.error,action:m.action?.type});if(result.ok)broadcast();
 }
 });conn.on('close',()=>{if(peer!==sessionPeer||!state)return;const id=connections.get(conn);connections.delete(conn);previousOwners.delete(conn);previousRevs.delete(conn);lastSendTime.delete(conn);if(id){const p=E.person(state,id);if(p){if(state.phase==='lobby'){state.players=state.players.filter(v=>v.id!==id);for(const [token,pid] of tokenStore)if(pid===id)tokenStore.delete(token);}else{p.connected=false;p.ready=false;}}broadcast();}});}
function broadcast(includeTerrain=false){if(!state)return;for(const c of connections.keys())if(c.open){try{const packed=pack(state,includeTerrain,connections.get(c));let delta=null,old=previousOwners.get(c);if(!includeTerrain&&old&&old.length===state.owners.length&&state.phase==='playing'){const changes=[];for(let i=0;i<old.length;i++)if(old[i]!==state.owners[i])changes.push(i,state.owners[i]);if(changes.length<state.owners.length*.32)delta=changes;}const out=delta?{...packed,owners:delta,ownerDelta:true,ownerBaseRev:previousRevs.get(c),packed:false}:packed;c.send({t:'state',state:out});previousOwners.set(c,state.owners.slice());previousRevs.set(c,state.territoryRevision);}catch(_){}}render();}
function savedSolo(){try{const x=JSON.parse(localStorage.getItem('bk-v14-save')||'null');return x?.phase==='playing'&&x.version===14?x:null;}catch(_){return null;}}
function updateResume(){const b=$('resumeButton');if(b)b.classList.toggle('hidden',!savedSolo());}
function createDemo(resume=false){
 if(state||peer)goHome();lastSaveTick=-1;defeatDismissed=false;
 lastHudLand=null;lastHudTick=-1;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";
 worldLayer=null;paintedRevision=-1;host=true;demo=true;pauseSolo=false;code='DEMO';
 const previous=resume?savedSolo():null;state=previous||E.lobby(Date.now());
 myId=state.players[0]?.id||E.addPlayer(state,name());
 if(state.phase==='lobby'){state.settings={bots:Number($('soloBots').value)};E.start(state,Number($('soloBots').value));}
 phaseShown='';setNetwork('SOLO');render();if(!resume)showTutorial();
}
function startGame(){if(serverActive){if(host)serverSend({t:'start'});return;}if(!host)return;const waiting=state.players.filter(p=>!p.bot&&p.connected!==false&&!p.ready);if(waiting.length)return toast('Waiting for: '+waiting.map(p=>p.name).join(', '));state.settings={bots:Number($('botCount').value)};const res=E.start(state,state.settings.bots);if(!res.ok)return toast(res.error);broadcast(true);showTutorial();}
function command(a){if(!state||state.phase!=='playing')return false;
 if(serverActive){if(Date.now()-lastStateAt>4500){toast('Wait for the server connection.','error');return false;}const id=++seq;if(!serverSend({t:'action',id,action:a})){toast('Server connection lost.','error');return false;}pendingOrders.set(id,Date.now());return true;}
 if(host){const r=E.action(state,myId,a);if(!r.ok){toast(r.error);return false;}broadcast();if(a.type==='build'){toast('Construction queued');refreshQuickBuild();}else if(a.type==='send'){toast('Offensive started');}return true;}
 if(upstream?.open){if(Date.now()-lastStateAt>4500){setNetwork('OFFLINE');toast('Data is outdated. Wait for reconnection before issuing an order.');return false;}const id=++seq;pendingOrders.set(id,Date.now());upstream.send({t:'action',id,action:a});return true;}toast('Room connection lost.');return false;}
function showTutorial(){if(!showTutorialOnce)return;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}showTutorialOnce=false;}

let spawnCursor=null,spawnPreviewSeed=null,spawnPreviewLayer=null,spawnPointer=null;
function renderSpawnMap(){
 if(!state||state.phase!=='lobby')return;
 const map=$('spawnMap'),c=map.getContext('2d'),scale=4;
 if(spawnPreviewSeed!==state.seed||!spawnPreviewLayer){
  spawnPreviewSeed=state.seed;spawnPreviewLayer=document.createElement('canvas');
  spawnPreviewLayer.width=E.W*scale;spawnPreviewLayer.height=E.H*scale;
  const layer=spawnPreviewLayer.getContext('2d'),terrain=E.previewTerrain(state);
  const colors=['#101b28','#526275','#3c6261','#697383','#678176','#8b7c60','#303e52'];
  for(let i=0;i<terrain.length;i++){layer.fillStyle=colors[terrain[i]];layer.fillRect((i%E.W)*scale,Math.floor(i/E.W)*scale,scale,scale);}
 }
 c.clearRect(0,0,map.width,map.height);c.drawImage(spawnPreviewLayer,0,0);
 for(const p of state.players){
  if(!p.spawnPoint)continue;const {x,y}=p.spawnPoint;
  c.beginPath();c.arc((x+.5)*scale,(y+.5)*scale,14*scale,0,Math.PI*2);
  c.fillStyle=p.id===myId?'rgba(57,213,255,.12)':'rgba(255,93,128,.12)';c.fill();
  c.beginPath();c.arc((x+.5)*scale,(y+.5)*scale,4*scale,0,Math.PI*2);
  c.fillStyle=p.color;c.fill();c.strokeStyle='#0b111a';c.lineWidth=3;c.stroke();
  c.fillStyle='#0b111a';c.font='bold 16px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(p.id),(x+.5)*scale,(y+.5)*scale);
 }
 if(spawnCursor){c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(spawnCursor.x*scale-5,spawnCursor.y*scale-5,14,14);}
 const own=mine()?.spawnPoint;
 $('spawnHint').textContent=own?'Your capital: '+own.x+', '+own.y+' · tap to move it.':'Tap land to place your capital, or leave Automatic.';
 $('spawnHint').dataset.kind='info';$('spawnAuto').disabled=!own;
 $('spawnLegend').innerHTML=state.players.filter(p=>!p.bot).map(p=>'<span class="spawn-player"><i style="background:'+esc(p.color)+'"></i><span>'+esc(p.name)+(p.id===myId?' (you)':'')+' · '+(p.spawnPoint?'chosen':'automatic')+'</span></span>').join('');
}
function chooseSpawn(point){
 if(!state||state.phase!=='lobby')return;
 const fail=point?E.spawnError(state,myId,point.x,point.y):null;
 if(fail){$('spawnHint').textContent=fail;$('spawnHint').dataset.kind='error';return;}
 if(serverActive){if(!serverSend({t:'spawn',point})){$('spawnHint').textContent='Wait for the room connection.';return;}}
 else if(host){const result=E.setSpawn(state,myId,point);if(!result.ok)return;broadcast();}
 else if(upstream?.open)upstream.send({t:'spawn',point});
 else{$('spawnHint').textContent='Wait for the room connection.';return;}
 spawnCursor=point;
 if(serverActive||!host){$('spawnHint').textContent='Saving starting position…';$('spawnHint').dataset.kind='info';}
 else renderSpawnMap();
}
$('spawnMap').onpointerdown=e=>{spawnPointer={x:e.clientX,y:e.clientY};};
$('spawnMap').onpointercancel=()=>{spawnPointer=null;};
$('spawnMap').onpointerup=e=>{
 if(!spawnPointer||Math.hypot(e.clientX-spawnPointer.x,e.clientY-spawnPointer.y)>12)return;
 spawnPointer=null;const r=$('spawnMap').getBoundingClientRect();
 chooseSpawn({x:Math.floor((e.clientX-r.left)/r.width*E.W),y:Math.floor((e.clientY-r.top)/r.height*E.H)});
};
$('spawnMap').onkeydown=e=>{
 if(!state||state.phase!=='lobby')return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();const cursor=spawnCursor||mine()?.spawnPoint||{x:Math.floor(E.W/2),y:Math.floor(E.H/2)};
  spawnCursor={x:Math.max(0,Math.min(E.W-1,cursor.x+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0))),y:Math.max(0,Math.min(E.H-1,cursor.y+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0)))};
  renderSpawnMap();
 }else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(spawnCursor)chooseSpawn(spawnCursor);}
};
$('spawnAuto').onclick=()=>chooseSpawn(null);

function render(){if(!state)return;
 if(state.phase==='lobby'){
  $('victory').classList.add('hidden');show('waiting');$('showCode').textContent=code;$('roomHeadingLabel').textContent=host?'ROOM READY':'IN ROOM';$('roomMembersCount').textContent=state.players.filter(p=>!p.bot).length+' players';
  patchHtml('waitingPlayers',state.players.map(p=>`<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${esc(p.name)}</strong><span class="muted">${[p.id===myId?'You':'',p.id===(serverActive?state.serverAdmin:1)?'Host':''].filter(Boolean).join(' · ')} · ${p.connected===false?'Offline':p.ready?'In room':'Connecting'}</span></div>`).join(''));
  $('startButton').classList.toggle('hidden',!host);$('readyButton').classList.add('hidden');$('readyButton').setAttribute('aria-pressed',String(readyLocal));$('readyButton').textContent=readyLocal?'Ready ✓':'I am ready';$('botCount').disabled=!host;
  $('startButton').disabled=!state.players.filter(p=>!p.bot).every(p=>p.ready||p.connected===false);$('botCount').value=state.settings?.bots??0;
  $('roomRules').textContent=serverActive?'Conquer 100% of the land. No time limit. The server runs the match; all players offline pauses it.':'Conquer 100% of the land. No time limit. The host must keep their tab open.';
  $('waitingHint').textContent=serverActive?(host?'You can start the match. The server runs the game.':'Waiting for the room leader. You are ready.'):host?'You are the host. Leaving closes the room.':'Waiting for host to start. You are ready.'; $('roomSettingsSummary').textContent=(state.settings?.bots??0)+' bots';
  renderSpawnMap();phaseShown='lobby';return;
 }
 if(phaseShown!=='playing'&&phaseShown!=='ended'){
  lastHudLand=null;lastHudTick=-1;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";
  show('game');phaseShown='playing';zoom=window.innerWidth<600?2.2:1.8;$('zoomText').textContent=Math.round(zoom*100)+'%';setMinimapExpanded(window.innerWidth>=850);resize();centerOnCapital();
 }else if(phaseShown==='ended'&&state.phase==='playing'&&!mine()?.eliminated){phaseShown='playing';}
 updateUI();repaintWorld();queueDraw();
 if((state.phase==='ended'||mine()?.eliminated&&!defeatDismissed)&&phaseShown!=='ended'){
  hideAux();closePanelIfOpen();closeNations();toggleQuickBuild(false);if(attackPlanner)resetAttackPlanner();buildMode=null;selected=null;
  phaseShown='ended';const w=state.players.find(p=>p.id===state.winner),me=mine();
  const outcome=me?.eliminated?'loss':!w?'draw':w.id===myId?'win':'loss';
  const reason=state.phase==='ended'?'The winner controls all land (100%).':'You lost all your land. You can spectate or leave.';
  if(demo){try{localStorage.removeItem('bk-v14-save');}catch(_){}}
  $('spectateMatch').classList.toggle('hidden',state.phase==='ended');
  const duration=Math.floor(state.tick/60)+'m '+String(state.tick%60).padStart(2,'0')+'s';
  $('victoryName').textContent=outcome==='win'?'Victory!':outcome==='loss'?'Defeat':'Draw';
  $('victoryEyebrow').textContent=outcome==='win'?'YOUR KINGDOM':outcome==='loss'?'MATCH ENDED':'MATCH ENDED';
  $('resultEmblem').textContent=outcome==='win'?'◆':outcome==='loss'?'✕':'◇';
  $('resultSheet').dataset.outcome=outcome;
  $('victoryDesc').textContent=outcome==='win'?'Your kingdom has won.':outcome==='loss'?`Winner: ${w?.name||'opponent'}.`:'No winner determined.';
  $('victoryReason').textContent=reason;
  const landPct=((me?.land||0)/Math.max(1,state.landTotal)*100).toFixed(1)+'%';
  const stats=[['TERRITORY',landPct],['CAPITALS TAKEN',number(me?.kills)],['BUILDINGS',number(state.buildings.filter(b=>b.owner===myId).length)],['DURATION',duration]];
  $('victoryStats').innerHTML=stats.map(([label,value])=>`<div class="result-stat"><small>${label}</small><b>${value}</b></div>`).join('');
  $('restart').disabled=!demo&&(!host||state.phase!=='ended');$('restart').textContent=demo?'New match':state.phase!=='ended'?'Match in progress':host?'Return to room':'Waiting for host…';
  $('victory').classList.remove('hidden');
 }
}
function setRate(node,value){const rate=Math.round(Number(value)||0);node.dataset.trend=rate>0?'positive':rate<0?'negative':'neutral';node.textContent=(rate>0?'+':rate<0?'−':'')+number(Math.abs(rate))+'/s';}
function updateUI(){const p=mine();if(!p)return;
 renderWars();syncPaintEligibility(attackPlanner);if(attackPlanner?.mode==='review')refreshPlanReview();else if(attackPlanner?.mode==='paint'&&attackPlanner.pointerId===null)refreshPaintGuide();
 // Before the first economy tick, derive the same production formula as the engine,
 // rather than showing a misleading +0/s for every resource.
 const {gross,recruited,foodNet}=resourceRates(p);
 for(const r of ['food','wood','stone','gold']){
  const suffix=r[0].toUpperCase()+r.slice(1),amount=Math.floor(p.res[r]||0);
  const rate=r==='food'?foodNet:Math.floor(gross[r]||0);
  $('res'+suffix).textContent=hudNumber(amount);
  const rateNode=$('inc'+suffix),item=rateNode.closest('[data-resource]');
  setRate(rateNode,rate);
  rateNode.classList.toggle('resource-negative',rate<0);
  item.classList.toggle('resource-low',r==='food'&&amount<Math.max(12,Math.abs(rate)*5));
  item.setAttribute('title',`${nameResource[r]}: ${number(amount)} / ${number(E.resourceCapacity(state,myId))}. ${r==='food'?'Estimated net growth after recruitment':'Production'}: ${rate>=0?'+':'−'}${number(Math.abs(rate))} per second`);
 }

 updateIncomingAttack(p);
 $('troopCount').textContent=hudNumber(p.troops);$('troopCount').title=number(p.troops);$('troopCap').textContent='/ '+hudNumber(p.troopCap);$('troopCap').title=number(p.troopCap);setRate($('troopGrowth'),p.troopIncome||0);updateHudSignals(p);$('myKingdom').textContent=p.name+(p.eliminated?' · ELIMINATED':'');$('myKingdom').title=p.name;$('myKingdom').style.color=p.color;
 const sent=Math.floor(p.troops*percent/100);
 const myPlans=[...(state.attackPlans||[]),...(state.recoveryPlans||[])].filter(v=>v.owner===myId),unplanned=state.armies.filter(a=>a.owner===myId&&!myPlans.some(plan=>plan.id===a.planId));
 const frontNum=myPlans.length+unplanned.length;
 $('sendingTroops').textContent=number(sent);$('remainingTroops').textContent=number(p.troops-sent);$('activeArmies').textContent=number(frontNum);$('dockSummary').textContent='AUTO';if(target)setPreview(target);$('frontCountBadge').textContent=String(frontNum);$('frontCountBadge').classList.toggle('hidden',frontNum===0);$('armiesToggle').setAttribute('aria-label',`My offensives: ${frontNum}`);$('armiesToggle').classList.toggle('has-fronts',frontNum>0);renderArmies();if(defensePicking)refreshArmyFocus();
 const top=[...state.players].filter(p=>p.land>0).sort((a,b)=>b.land-a.land);
 patchHtml('quickLeadersList',top.length?top.map((v,i)=>`<div class="quick-row${v.id===myId?' is-me':''}"><span class="leader-rank">${i+1}</span><i class="leader-dot" style="background:${v.color}"></i><b>${esc(v.name)}${v.bot?' · Bot':''}</b><small>${(v.land/Math.max(1,state.landTotal)*100).toFixed(1)}% · ${number(v.land)} tiles</small></div>`).join(''):'<p class="leader-empty">No active players</p>');
 updateTechCards(p);
 patchHtml('accessibleObjects',state.buildings.filter(b=>b.owner===myId).slice(0,30).map(b=>'<li>'+esc(E.KINDS[b.kind]?.name||'Capital')+' '+b.x+','+b.y+'</li>').join('')+state.armies.filter(a=>a.owner===myId).map(a=>'<li>Army '+number(a.strength)+' troops, '+a.x+','+a.y+'</li>').join(''));
 if(state.log?.[0]&&state.tick>3&&state.log[0]!==lastAnnounced){const message=state.log[0];lastAnnounced=message;if(!/researched|completed/i.test(message)&&/captured the capital|eliminated|won|alliance/.test(message.toLowerCase()))toast(message);}
 updateSelection();refreshQuickBuild();
}

/* v24: keep live research buttons mounted when resource totals change.
   Rebuilding a button each tick changes layout and drops an in-flight touch. */
function updateTechCards(p){
 const panel=$('techPanel'),entries=Object.entries(E.TECH);
 const key=entries.map(([id])=>id+':'+(p.tech[id]||0)).join('|');
 if(panel.dataset.structure!==key){
  panel.innerHTML=entries.map(([id,t])=>{
   const level=p.tech[id]||0,cost=E.costTech(id,level);
   return `<div class="tech-item tech-detail" data-tech-card="${esc(id)}">
     <div class="tech-heading">${uiIcon(id)}<strong>${esc(t.name)}</strong><span title="Research level">${level}/3</span></div>
     <p>${esc(techBenefit(id,level))}</p>
     <div class="tech-next">${level<3?'→ '+esc(techBenefit(id,level+1)):'Maximum level'}</div>
     <div class="tech-footer"><div class="tech-price"><small class="tech-cost">${level<3?briefCost(cost):''}</small><div class="tech-availability" data-tech-status="${esc(id)}"></div></div><button type="button" data-research="${esc(id)}">${level<3?'Research':'Done'}</button></div>
   </div>`;
  }).join('');
  panel.dataset.structure=key;
 }
 for(const [id] of entries){
  const level=p.tech[id]||0,cost=E.costTech(id,level);
  const affordable=level<3&&!p.eliminated&&canPay(p,cost);
  const button=panel.querySelector('[data-research="'+id+'"]'),status=panel.querySelector('[data-tech-status="'+id+'"]');
  if(!button||!status)continue;
  button.disabled=!affordable;
  const message=level>=3?'Maximum level':p.eliminated?'Kingdom eliminated':affordable?'':'Missing: '+Object.entries(cost).filter(([r,n])=>(p.res[r]||0)<n).map(([r,n])=>nameResource[r]+' '+(n-(p.res[r]||0))).join(' · ');
  if(status.textContent!==message)status.textContent=message;
  status.title=message;
  status.classList.toggle('can-research',affordable);
 }
}
function updateSelection(){const item=selected?.kind==='army'?state.armies.find(a=>a.id===selected.id):selected?.kind==='building'?state.buildings.find(b=>b.id===selected.id):null;contextual(item);}
// Fast-build selection: choosing a building does not spend resources.
// Placement is performed with a separate map tap after the player sees legal cells.
function refreshQuickBuild(){
 const p=mine();if(!p||!state)return;
 const dock=$('buildDock');
 if(!dock.dataset.ready||dock.dataset.roofOwner!==String(myId)){dock.innerHTML=['city','barracks','fort'].map(id=>'<button type="button" data-place-building="'+id+'" aria-label="Place '+E.KINDS[id].name+'" aria-pressed="false">'+buildingArt(id,myId,1)+'<span>'+E.KINDS[id].name+'</span><small class="dock-time">'+E.constructionTime(id)+'s build</small><small class="dock-cost"></small></button>').join('');dock.dataset.ready='yes';dock.dataset.roofOwner=String(myId);}
 for(const id of ['city','barracks','fort']){const b=dock.querySelector('[data-place-building="'+id+'"]');b.classList.toggle('chosen',buildMode===id);b.setAttribute('aria-pressed',String(buildMode===id));const cost=E.costBuilding(state,myId,id);b.title=E.KINDS[id].name+' · '+costText(cost)+' · '+E.constructionTime(id)+'s construction after builders arrive';const price=b.querySelector('.dock-cost'),key=JSON.stringify(cost);if(price.dataset.cost!==key){price.innerHTML=briefCost(cost);price.dataset.cost=key;}}
 $('placingBuild').classList.add('hidden');
 if(buildMode){$('placingBuildName').textContent=E.KINDS[buildMode].name;$('placingBuildCost').textContent=costText(E.costBuilding(state,myId,buildMode));$('placingBuildIcon').innerHTML=uiIcon(buildMode);}
 const workers=E.workforceStats(state,myId);
 $('workerCount').textContent=hudNumber(workers.capacity);$('workerStatus').textContent=number(workers.working)+' working';
 for(const r of ['food','wood','stone','gold']){const node=$('resourceSummary').querySelector('[data-resource="'+r+'"]'),active=p.workPriority===r;node.setAttribute('aria-pressed',String(active));node.classList.toggle('priority-selected',active);}
 $('workforceSummary').textContent=number(workers.working)+' / '+number(workers.capacity)+' working · '+workers.building+' queued';
 $('productionPriority').value=p.workPriority||'balanced';
 $('storageSummary').textContent='Storage: '+number(E.resourceCapacity(state,myId))+' per resource · '+number(p.land)+' land cells';
}

function toggleQuickBuild(force){
 const opening=typeof force==='boolean'?force:!quickBuildOpen;
 if(opening&&defensePicking)exitArmyFocus();
 if(opening){if(attackPlanner)resetAttackPlanner();hideAux();closeNations();setThreatList(false);}
 quickBuildOpen=opening;
 $('quickBuild').classList.toggle('hidden',!quickBuildOpen);
 $('mapView').classList.toggle('build-palette-open',quickBuildOpen);
 $('developButton').classList.toggle('chosen',quickBuildOpen||!!buildMode);$('developButton').setAttribute('aria-pressed',String(quickBuildOpen||!!buildMode));
 if(quickBuildOpen){closePanelIfOpen();setPreview(null);}
 refreshQuickBuild();queueDraw();
}
function closePanelIfOpen(){if(panelOpen)closePanel();}
function setBuildingMode(kind){exitArmyFocus();
 if(E.KINDS[kind]?.income){if(attackPlanner)resetAttackPlanner();buildMode=null;command({type:'setWorkPriority',priority:E.KINDS[kind].income});refreshQuickBuild();queueDraw();return;}
 if(kind&&attackPlanner)resetAttackPlanner();
 buildMode=kind||null;selected=null;setPreview(null);moveCursor=null;
 $('developButton').classList.toggle('chosen',!!buildMode||quickBuildOpen);$('developButton').setAttribute('aria-pressed',String(!!buildMode||quickBuildOpen));
 $('cancelMode').classList.toggle('hidden',!buildMode);
 $('modeLabel').textContent=buildMode?'Build: '+E.KINDS[buildMode].name:'Offensive';
 $('actionHint').textContent=buildMode?'Green tile — allowed, red tile — blocked.':'Tap a target or drag from your land.';
 if(buildMode)toggleQuickBuild(false);
 refreshQuickBuild();updateUI();queueDraw();
}
const chooseResource=r=>{const p=mine();if(p&&['food','wood','stone','gold'].includes(r)){command({type:'setWorkPriority',priority:p.workPriority===r?'balanced':r});refreshQuickBuild();}};
let resourcePress=null,lastResourcePointer=null;
$('resourceSummary').addEventListener('pointerdown',e=>{const item=e.target.closest('[data-resource]');resourcePress=item&&e.isPrimary!==false?{id:e.pointerId,resource:item.dataset.resource,x:e.clientX,y:e.clientY}:null;});
$('resourceSummary').addEventListener('pointercancel',()=>{resourcePress=null;});
$('resourceSummary').addEventListener('pointerup',e=>{
 const item=e.target.closest('[data-resource]'),press=resourcePress;resourcePress=null;
 if(!item||!press||press.id!==e.pointerId)return;
 lastResourcePointer={resource:item.dataset.resource,at:Date.now()};
 if(press.resource===item.dataset.resource&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<10)chooseResource(item.dataset.resource);
});
$('resourceSummary').addEventListener('click',e=>{const item=e.target.closest('[data-resource]');if(!item)return;
 // Pointer activation is immediate; a delayed compatibility click cannot
 // toggle it a second time. Keyboard/programmatic clicks remain supported.
 if(e.detail&&lastResourcePointer?.resource===item.dataset.resource&&Date.now()-lastResourcePointer.at<800)return;
 chooseResource(item.dataset.resource);
});
$('resourceSummary').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const item=e.target.closest('[data-resource]');if(item){e.preventDefault();chooseResource(item.dataset.resource);}}});
$('productionPriority').onchange=e=>command({type:'setWorkPriority',priority:e.target.value});
$('buildDock').addEventListener('click',e=>{const b=e.target.closest('[data-place-building]');if(b)setBuildingMode(buildMode===b.dataset.placeBuilding?null:b.dataset.placeBuilding);});
$('quickBuildChoices').addEventListener('click',e=>{const b=e.target.closest('[data-fast-build]');if(b)setBuildingMode(b.dataset.fastBuild);});
$('quickBuildClose').onclick=()=>toggleQuickBuild(false);
$('quickBuildInfo').onclick=()=>{const expanded=$('quickBuild').classList.toggle('with-descriptions');$('quickBuildInfo').setAttribute('aria-expanded',String(expanded));refreshQuickBuild();};
$('changeBuild').onclick=()=>setBuildingMode(null);
$('stopBuild').onclick=cancelMode;

$('techPanel').addEventListener('click',e=>{const b=e.target.closest('[data-research]');if(b)command({type:'research',key:b.dataset.research});});
$('contextCard').addEventListener('click',e=>{const u=e.target.closest('[data-context-upgrade]'),r=e.target.closest('[data-context-return]'),d=e.target.closest('[data-context-redirect]');if(u)command({type:'upgrade',id:u.dataset.contextUpgrade});if(r){command({type:'return',id:r.dataset.contextReturn});contextual(null);}if(d){redirectArmy=d.dataset.contextRedirect;toast('Now choose a new target on the map.');contextual(null);}});
$('closeContext').onclick=()=>{selected=null;contextual(null);hideAux()};
function openPanel(){closeNations();setThreatList(false);if(attackPlanner)resetAttackPlanner();hideAux();toggleQuickBuild(false);setPreview(null);previousFocus=document.activeElement;panelOpen=true;$('sidebar').classList.add('open');$('panelBackdrop').classList.remove('hidden');$('sidebar').setAttribute('aria-modal',String(window.innerWidth<851));$('closePanel').focus();}
function closePanel(){panelOpen=false;$('scienceButton').setAttribute('aria-pressed','false');$('scienceButton').classList.remove('chosen');$('sidebar').classList.remove('open');$('panelBackdrop').classList.add('hidden');$('sidebar').setAttribute('aria-modal','false');previousFocus?.focus?.();}
$('menuToggle').onclick=openSession;$('developButton').onclick=()=>toggleQuickBuild();$('closePanel').onclick=closePanel;$('panelBackdrop').onclick=closePanel;$('auxBackdrop').onclick=hideAux;
$('attackPercent').oninput=e=>{percent=Number(e.target.value);$('percentLabel').textContent=percent+'%';document.querySelectorAll('[data-percent]').forEach(t=>{const on=Number(t.dataset.percent)===percent;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});if(state)updateUI();};
document.querySelectorAll('[data-target-percent]').forEach(b=>b.onclick=()=>{$('attackPercent').value=b.dataset.targetPercent;$('attackPercent').oninput({target:$('attackPercent')});});
for(const b of document.querySelectorAll('[data-percent]')){b.setAttribute('aria-pressed',String(Number(b.dataset.percent)===percent));b.onclick=()=>{$('attackPercent').value=b.dataset.percent;$('attackPercent').oninput({target:$('attackPercent')});};}
$('cancelMode').onclick=cancelMode;function cancelMode(){setBuildingMode(null);}
$('cancelTarget').onclick=()=>{setPreview(null);redirectArmy=null;lastTap=0;};$('confirmTarget').onclick=()=>{if(!target)return;if(target.type!=='redirect'){beginAttackPlanner();return;}const t=target;const ok=command({type:'redirect',id:t.id,x:t.x,y:t.y});if(ok){setPreview(null);redirectArmy=null;}};

$('planGuideExit').onclick=resetAttackPlanner;
$('planReviewClose').onclick=editPaintedZone;
$('planDiscard').onclick=editPaintedZone;
$('planPaintClear').onclick=clearPaintedZone;
function refreshArmyFocus(){
 $('armyFocusGuide').classList.toggle('hidden',!defensePicking);
 const f=mine()?.armyFocus;if(!f){$('armyFocusDetail').textContent='Tap your land or a planned attack area';$('armyFocusGuide').dataset.valid='true';return;}
 const status=E.focusStatus(state,myId,f),own=status==='defend';
 if(status==='invalid'){$('armyFocusDetail').textContent='Outside your land or plans · army will not follow this point';$('armyFocusGuide').dataset.valid='false';return;}
 $('armyFocusGuide').dataset.valid='true';
 const squads=own?(mine()?.garrisons||[]).filter(g=>g.tx===f.x&&g.ty===f.y):state.armies.filter(a=>a.owner===myId).flatMap(a=>a.columns||[]).filter(c=>Math.abs((c.tx??c.x)-f.x)+Math.abs((c.ty??c.y)-f.y)<=24);
 const assigned=squads.reduce((n,g)=>n+g.strength,0),moving=squads.filter(g=>g.x!==g.tx||g.y!==g.ty).reduce((n,g)=>n+g.strength,0);
 $('armyFocusDetail').textContent=(own?'Defend':'Attack')+' · '+number(assigned)+' assigned · '+number(moving)+' en route'+(assigned?'':own?' · waiting for reserve':' · waiting for a reachable front');
}
function exitArmyFocus(){defensePicking=false;focusHover=null;$('planToolFocus').classList.remove('chosen');$('planToolFocus').setAttribute('aria-pressed','false');refreshArmyFocus();queueDraw();}
$('planToolSwitch').addEventListener('click',e=>{const button=e.target.closest('button');if(button&&button.id!=='planToolFocus'&&defensePicking)exitArmyFocus();},true);
$('planToolFocus').onclick=()=>{const wasPicking=defensePicking;if(attackPlanner)resetAttackPlanner();closeNations();hideAux();setBuildingMode(null);defensePicking=!wasPicking;focusHover=null;$('planToolFocus').classList.toggle('chosen',defensePicking);$('planToolFocus').setAttribute('aria-pressed',String(defensePicking));refreshArmyFocus();queueDraw();};
$('exitArmyFocus').onclick=exitArmyFocus;
$('clearArmyFocus').onclick=()=>{command({type:'armyFocus',clear:true});focusHover=null;refreshArmyFocus();queueDraw();};
$('eraseExit').onclick=resetAttackPlanner;
$('eraseReset').onclick=()=>{if(attackPlanner?.mode==='erase'){attackPlanner.cells.clear();refreshPaintGuide();queueDraw();}};
$('eraseApply').onclick=()=>{const p=attackPlanner;if(p?.mode==='erase'&&p.cells.size&&command({type:'erasePlanCells',cells:[...p.cells]})){p.cells.clear();refreshPaintGuide();queueDraw();}};
$('planToolPaint').onclick=()=>togglePaintTool('paint');
$('planToolErase').onclick=()=>togglePaintTool('erase');
$('planReviewButton').onclick=reviewPaintedZone;
$('planBrushSize').oninput=e=>{if(!attackPlanner)return;attackPlanner.brushRadius=Number(e.target.value)||2;$('planBrushValue').textContent=String(attackPlanner.brushRadius);refreshPaintGuide();queueDraw();};
$('planTroopsPercent').oninput=e=>{percent=Number(e.target.value)||30;$('attackPercent').value=percent;$('percentLabel').textContent=percent+'%';refreshPaintGuide();};
document.querySelectorAll('[data-plan-percent]').forEach(btn=>btn.onclick=()=>{
 percent=Number(btn.dataset.planPercent);$('attackPercent').value=percent;$('percentLabel').textContent=percent+'%';refreshPlanReview();
});
$('planLaunch').onclick=()=>{
 const plan=attackPlanner;if(plan?.mode!=='review')return;
 const order={type:'send',x:plan.x,y:plan.y,percent,zone:plan.zoneCells.slice()};
 if(command(order)){resetAttackPlanner();toast(plan.targetOwner?'Offensive ordered. War state updated.':'Offensive ordered.');}
};
$('planCancelNo').onclick=()=>{$('planCancelDialog').classList.add('hidden');planCancelArmy=null;};
$('planCancelYes').onclick=()=>{
 const id=planCancelArmy,planned=(state.attackPlans||[]).some(p=>p.id===id);
 if(id&&command({type:planned?'cancelPlan':'return',id}))toast(planned?'Offensive plan cancelled':'Offensive recalled');
 $('planCancelDialog').classList.add('hidden');planCancelArmy=null;
};
$('warChip').onclick=()=>{
 if(!$('warPanel').classList.contains('hidden')&&militaryTab==='nations')closeNations();
 else openMilitary('nations');
};
$('warTabNations').onclick=()=>chooseMilitaryTab('nations');
$('warTabThreats').onclick=()=>chooseMilitaryTab('threats');
$('warTabArmy').onclick=()=>chooseMilitaryTab('army');
$('warPanelClose').onclick=closeNations;$('nationsBackdrop').onclick=closeNations;
$('warPanelList').onclick=e=>{
 const attack=e.target.closest('[data-nation-attack]'),peace=e.target.closest('[data-nation-peace]'),
  alliance=e.target.closest('[data-nation-diplomacy]');
 const btn=attack||peace||alliance;if(!btn||btn.disabled)return;
 const id=Number(attack?.dataset.nationAttack??peace?.dataset.nationPeace??alliance?.dataset.nationDiplomacy);
 if(attack){
  const enabled=!selectedNationTargets().includes(id);
  if(command({type:'setNationTarget',target:id,enabled})){
   toast(enabled?'Attacks enabled · plans updated':'Attacks stopped · war remains until peace');
   renderWars();if(attackPlanner?.mode==='paint'){refreshPaintGuide();queueDraw();}
  }
 }else if(peace){
  const accepted=(state.peaceOffers||[]).some(o=>o.from===id&&o.to===myId);
  if(command({type:'peace',target:id})){toast(accepted?'Peace treaty signed':'Peace offer sent');renderWars();}
 }else if(alliance){
  const me=mine(),other=E.person(state,id),breaking=me?.allies.includes(id),accepting=other?.offers?.includes(myId);
  if(command({type:'diplomacy',target:id})){
   toast(breaking?'Alliance ended':accepting?'Alliance formed':'Alliance offer sent');renderWars();
  }
 }
};
$('targetPeace').onclick=()=>{
 if(!target||target.type!=='send')return;
 const owner=E.owner(state,target.x,target.y),accepted=(state.peaceOffers||[]).some(o=>o.from===owner&&o.to===myId);
 if(!owner||!fighting(owner))return;
 if(command({type:'peace',target:owner})){toast(accepted?'Peace treaty accepted':'Peace proposal sent');setPreview(null);}
};

$('targetDiplomacy').onclick=()=>{
 if(!target||target.type!=='send')return;
 const owner=E.owner(state,target.x,target.y),other=E.person(state,owner),me=mine();
 if(!other||!me||other.id===myId||fighting(owner)||(!me.allies.includes(owner)&&(other.bot||me.offers.includes(owner))))return;
 const breaking=me.allies.includes(owner);
 if(breaking&&!target.confirmBreak){target.confirmBreak=true;setPreview(target);return;}
 const accepting=other.offers.includes(myId);
 if(command({type:'diplomacy',target:owner})){
  toast(breaking?'Alliance ended':accepting?'Alliance acceptance sent':'Alliance offer sent');
  if(state?.phase==='playing'&&target)setPreview(target);
 }
};
$('dockToggle').onclick=()=>{const dock=$('battleDock');const collapsed=dock.classList.toggle('collapsed');$('dockToggle').setAttribute('aria-expanded',String(!collapsed));};
function setMinimapExpanded(expanded){
 $('minimapWrap').classList.toggle('minimized',!expanded);
 $('minimapToggle').setAttribute('aria-expanded',String(!!expanded));
 $('minimapToggle').setAttribute('aria-label',expanded?'Hide minimap':'Show minimap');
 $('minimapToggle').querySelector('.minimap-chevron').textContent=expanded?'−':'+';
 $('minimap').tabIndex=expanded?0:-1;
}
$('minimapToggle').onclick=()=>setMinimapExpanded($('minimapWrap').classList.contains('minimized'));
function renderArmies(){
 if(!state||!myId||$('warPanel').classList.contains('hidden')||militaryTab!=='army')return;
 const plans=(state.attackPlans||[]).filter(p=>p.owner===myId);
 const recovery=(state.recoveryPlans||[]).filter(p=>p.owner===myId);
 const plannedIDs=new Set([...plans,...recovery].map(p=>p.id)),rows=[];
 for(const p of plans){
  const active=state.armies.find(a=>a.planId===p.id&&a.strength>0);
  const left=p.zoneCells.filter(i=>state.tiles[i]&&state.owners[i]!==myId).length;
  const choices=selectedNationTargets(),label=choices.map(id=>E.person(state,id)?.name||'Neutral land').join(', ');
  const capturable=p.zoneCells.some(i=>state.tiles[i]&&state.owners[i]!==myId&&choices.includes(state.owners[i]));
  const estimate=E.estimatePlanFront(state,p),allocation=E.automaticAllocation(state,p),moving=(active?.columns||[]).filter(c=>c.x!==c.tx||c.y!==c.ty).reduce((n,c)=>n+c.strength,0);
  rows.push({key:'plan-'+p.id,
   title:label+' · '+number(left)+' cells left',
   status:active?(active.waitingForRoute?'Waiting for friendly route · ':active.awaitingReinforcements?'Reinforcements requested · ':active.marching?'Local advance · troops moving · ':'Local advance · ')+number(p.waves)+' · '+number(active.strength)+' troops · '+estimate.cells+' frontier cells':
    estimate.cells&&estimate.committed<Math.max(35,estimate.required)?'Automatic deployment · '+number(estimate.committed)+' troops available now':
    !capturable?'Choose opponents in Nations':'Waiting for route / troops',
   detail:(p.allocationMode==='troops'?number(p.allocationValue)+' requested':p.allocationMode==='percent'?p.allocationValue+'% requested':'Auto')+' · '+number(active?.strength||0)+' assigned · '+number(moving)+' en route · '+number(allocation.target)+' target',
   buttons:'<button data-cancel-plan="'+esc(p.id)+'">Cancel</button>'});
 }
 for(const p of recovery){
  const active=state.armies.find(a=>a.planId===p.id&&a.strength>0);
  const pending=p.zoneCells.filter(i=>state.tiles[i]&&state.owners[i]===p.targetOwner).length;if(!pending)continue;
  rows.push({key:'recovery-'+p.id,title:'Recovery · '+(E.person(state,p.targetOwner)?.name||'Enemy')+' · '+number(pending)+' cells',
   status:active?(active.waitingForRoute?'Waiting for friendly route · ':active.awaitingReinforcements?'Reinforcements requested · ':active.marching?'Marching to recovery · ':'Counterattack underway · ')+number(active.strength)+' troops':'Preparing troops for recapture',
   detail:active?E.frontDeployment(active).ready+'/'+E.frontDeployment(active).sectors+' sectors ready · local recovery':'Automatic during war · stops after peace',
   buttons:'<button data-focus-plan="'+esc(p.id)+'" aria-label="Locate recovery front">Locate</button>'});
 }
 for(const a of state.armies.filter(a=>a.owner===myId&&!plannedIDs.has(a.planId))){
  const initial=a.initialStrength||a.strength,spent=Math.max(0,initial-a.strength);
  rows.push({key:'army-'+a.id,title:number(a.strength)+' troops · of '+number(initial),
   status:(E.person(state,a.targetOwner)?.name||'Neutral land')+' · '+(a.marching?'Marching to front':a.stuck>0?'Front meets resistance':'Advancing'),
   detail:'Captured '+number(a.captured||0)+' cells · Losses '+number(spent),
   buttons:'<button data-focus-army="'+esc(a.id)+'" aria-label="Locate army">Locate</button><button data-recall-army="'+esc(a.id)+'" aria-label="Recall army">Recall</button>'});
 }
 const guards=mine()?.garrisons||[],returning=guards.filter(g=>g.returning).reduce((n,g)=>n+g.strength,0);
 const strength=E.militaryStrength(state,myId);
 // Reserve is a permanent section. A garrison snapshot may temporarily be empty.
 rows.unshift({key:'home-army',title:'Home army · '+number(strength.reserve)+' troops',
  status:(mine()?.recruitment?.reason||'Recruiting')+' · +'+number(mine()?.troopIncome||0)+'/s · '+(guards.length?(guards.some(g=>g.role==='Guard')?'Guarding war fronts · reserve held behind the line':'Garrisoned near barracks and cities'):
   strength.reserve?'Reserve not yet positioned on the map':strength.deployed?'Troops assigned to active fronts':'No home troops available'),
  detail:guards.length?number(guards.length)+' squads · '+number(returning)+' returning · nearby troops provide defense':
   '0 squads · '+number(strength.deployed)+' deployed',buttons:'<select data-army-posture aria-label="Army posture">'+['aggressive','balanced','defensive'].map(v=>'<option value="'+v+'"'+((mine()?.armyPosture||'balanced')===v?' selected':'')+'>'+v[0].toUpperCase()+v.slice(1)+'</option>').join('')+'</select>'});
 const container=$('armiesList'),structure=rows.map(row=>row.key).join('|')+plans.map(p=>[p.focus,p.allocationMode,p.allocationValue].join(':')).join('|')+JSON.stringify(mine()?.armyFocus)+mine()?.armyPosture;
 if(container.dataset.structure!==structure){
  container.innerHTML=rows.length?rows.map(row=>'<div class="army-line" data-front-row="'+esc(row.key)+'"><div><strong data-front-title></strong><small data-front-status></small><small class="army-stats" data-front-detail></small></div>'+row.buttons+'</div>').join(''):
   '<div class="empty-armies"><strong>No offensives yet</strong><p>Tap the brush to paint a zone.</p></div>';
  container.dataset.structure=structure;
 }
 for(const row of rows){
  const node=container.querySelector('[data-front-row="'+row.key+'"]');if(!node)continue;
  for(const field of ['title','status','detail']){const target=node.querySelector('[data-front-'+field+']');if(target)target.textContent=row[field];}
 }
}
$('armiesToggle').onclick=()=>openMilitary('army');
$('closeArmies').onclick=hideAux;
$('armiesList').onchange=e=>{
 if(e.target.closest('[data-army-posture]')){command({type:'armyPosture',value:e.target.value});return;}

};
$('armiesList').onclick=e=>{
 const cancel=e.target.closest('[data-cancel-plan]'),edit=e.target.closest('[data-edit-plan]'),focus=e.target.closest('[data-focus-plan]');
 const recall=e.target.closest('[data-recall-army]'),armyFocus=e.target.closest('[data-focus-army]');
 if(cancel){const plan=(state.attackPlans||[]).find(p=>p.id===cancel.dataset.cancelPlan);if(plan){hideAux();openCancelPlan(plan);}return;}
 if(edit){const plan=(state.attackPlans||[]).find(p=>p.id===edit.dataset.editPlan);if(plan){hideAux();beginAttackPlanner(plan);}return;}
 if(focus){
  const plan=[...(state.attackPlans||[]),...(state.recoveryPlans||[])].find(p=>p.id===focus.dataset.focusPlan);
  if(plan){const active=state.armies.find(a=>a.planId===plan.id),i=plan.zoneCells.find(i=>state.owners[i]!==myId)??plan.zoneCells[0],x=active?.x??i%E.W,y=active?.y??(i/E.W)|0;camX=canvas.clientWidth/2-(x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(y+.5)*TILE*zoom;clampCamera();hideAux();queueDraw();}
  return;
 }
 if(recall){const a=state.armies.find(a=>a.id===recall.dataset.recallArmy);if(a){hideAux();openCancelPlan(a);}return;}
 if(armyFocus){const a=state.armies.find(a=>a.id===armyFocus.dataset.focusArmy);if(a){camX=canvas.clientWidth/2-(a.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(a.y+.5)*TILE*zoom;clampCamera();hideAux();queueDraw();}}
};
$('helpButton').onclick=()=>{closeNations();closePanelIfOpen();toggleQuickBuild(false);if(attackPlanner)resetAttackPlanner();hideAux();$('tutorial').classList.remove('hidden');$('closeTutorial').focus();};$('closeTutorial').onclick=()=>{$('tutorial').classList.add('hidden');showTutorialOnce=false;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}$('mapCanvas').focus();};
$('pauseGame').onclick=()=>{if(!demo)return toast('Pause is only available in solo mode.');pauseSolo=!pauseSolo;$('pauseGame').textContent=pauseSolo?'Resume':'Pause';saveSolo();};
$('myKingdom').onclick=()=>toast(mine()?.name||'Kingdom');
function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<1)return;const dpr=Math.min(window.innerWidth<900?1:1.5,devicePixelRatio||1);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;queueDraw();}}
function centerOnCapital(){const p=mine();if(!p?.capital)return;const c=p.capital;const r=canvas.getBoundingClientRect();camX=r.width/2-(c.x+.5)*TILE*zoom;camY=r.height/2-(c.y+.5)*TILE*zoom;clampCamera();queueDraw();}
function clampCamera(){
 const r=canvas.getBoundingClientRect(),mapW=E.W*TILE*zoom,mapH=E.H*TILE*zoom;
 // Pan past the map edges so a boundary cell can be placed into the free middle of the screen,
 // out from under the build bar, minimap and mobile toolbars.
 const pan=(view,extent,current)=>{
   if(extent<view*.35)return (view-extent)/2;
   const lower=view*.58-extent,upper=view*.42;
   return Math.max(lower,Math.min(upper,current));
 };
 camX=pan(r.width,mapW,camX);camY=pan(r.height,mapH,camY);
}
function zoomAt(factor,cx,cy){const old=zoom;zoom=Math.max(.14,Math.min(5,zoom*factor));camX=cx-(cx-camX)*zoom/old;camY=cy-(cy-camY)*zoom/old;clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
function pixelAt(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:clientX-r.left,y:clientY-r.top};}
function gridAt(clientX,clientY){const p=pixelAt(clientX,clientY);return {x:Math.floor((p.x-camX)/(TILE*zoom)),y:Math.floor((p.y-camY)/(TILE*zoom))};}
function nearestObject(px,py,kind){const arr=kind==='army'?state.armies:state.buildings.filter(b=>E.visibleBuilding(state,myId,b)),worldX=(px-camX)/(TILE*zoom),worldY=(py-camY)/(TILE*zoom);let nearest=null,best=Infinity;for(const v of arr){const d=Math.hypot(v.x+.5-worldX,v.y+.5-worldY)*TILE*zoom;if(d<best&&d<(kind==='army'?23:25)){best=d;nearest=v;}}return nearest;}
let defensePicking=false,focusHover=null;
function selectMap(clientX,clientY){
 if(mapInputBlocked())return;
 if(state?.phase!=='playing'||mine()?.eliminated)return;
 const pt=pixelAt(clientX,clientY),p=gridAt(clientX,clientY);
 if(!E.inside(p.x,p.y))return;
 if(defensePicking){command({type:'armyFocus',x:p.x,y:p.y});focusHover=null;refreshArmyFocus();queueDraw();return;}
 if(attackPlanner)return;
 inspectCell(p.x,p.y);$('mapHint').classList.add('hidden');
 if(buildMode){
  moveCursor=p;if(E.owner(state,p.x,p.y)!==myId)return toast('Must be your territory','error');
  const fail=E.canBuild(state,myId,buildMode,p.x,p.y);if(fail)return toast(fail,'error');
  if(command({type:'queueBuild',kind:buildMode,x:p.x,y:p.y}))toast('Construction queued');queueDraw();return;
 }
 if(redirectArmy){setPreview({type:'redirect',id:redirectArmy,x:p.x,y:p.y,valid:true});return;}
 // In a conquest game, tap ownership wins over enlarged decorative hitboxes.
 // Enemy buildings and friendly icons near an enemy border must not block attacks.
 const clickedOwner=E.owner(state,p.x,p.y);
 if(clickedOwner!==myId){
  if(!E.tile(state,p.x,p.y))return toast('You cannot conquer the sea. Choose land.');
  selected=null;contextual(null);
  const opponent=E.person(state,clickedOwner);
  if(opponent&&!opponent.eliminated){
   openMilitary('nations');
   const row=$('warPanelList').querySelector('[data-nation-id="'+clickedOwner+'"]');
   if(row){row.classList.add('focused');row.scrollIntoView({block:'nearest',behavior:'instant'});}
  }else setPreview(null);
  return;
 }
 const a=nearestObject(pt.x,pt.y,'army');
 if(a?.owner===myId){selected={kind:'army',id:a.id};updateSelection();setPreview(null);return;}
 const b=nearestObject(pt.x,pt.y,'building');
 if(b?.owner===myId){selected={kind:'building',id:b.id};updateSelection();setPreview(null);return;}
 setPreview(null);
}
function updateMapStatus(x,y){inspectCell(x,y);}
// Normal mode pans and inspects the map. Attack mode exclusively paints.

// A pending first touch is not painted until it moves or is released as a tap.
// Two touches anchor the world position under their midpoint for pan + pinch zoom.
function beginPaintNavigation(){
 const [a,b]=[...pressed.values()];
 if(!a||!b){gesture=null;return;}
 const r=canvas.getBoundingClientRect();
 const cx=(a.x+b.x)/2-r.left,cy=(a.y+b.y)/2-r.top;
 gesture={dist:Math.hypot(a.x-b.x,a.y-b.y),zoom,worldX:(cx-camX)/(TILE*zoom),worldY:(cy-camY)/(TILE*zoom)};
}
function updatePaintNavigation(){
 if(!gesture||pressed.size<2)return;
 const [a,b]=[...pressed.values()],r=canvas.getBoundingClientRect();
 const cx=(a.x+b.x)/2-r.left,cy=(a.y+b.y)/2-r.top;
 zoom=Math.max(.2,Math.min(5,gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.dist)));
 camX=cx-gesture.worldX*TILE*zoom;camY=cy-gesture.worldY*TILE*zoom;
 clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();
}
function finishPaintPointer(e,cancelled=false){
 const plan=attackPlanner;if(!plan)return;
 const wasSingle=pressed.size===1&&pressed.has(e.pointerId)&&!plan.touchLocked&&plan.pointerId===e.pointerId;
 if(!cancelled&&wasSingle){
  if(!plan.lastPoint&&plan.strokeStart)paintAtPointer(plan.strokeStart);
  else if(plan.lastPoint)paintAtPointer(gridAt(e.clientX,e.clientY));
 }
 if(plan.mode==='erase'&&cancelled&&plan.eraseBefore)plan.cells=new Set(plan.eraseBefore);
 pressed.delete(e.pointerId);
 plan.pointerId=null;plan.lastPoint=null;plan.strokeStart=null;plan.strokeOrigin=null;plan.brushPoint=null;
 if(pressed.size>=2){plan.touchLocked=true;beginPaintNavigation();}
 else if(pressed.size===1){plan.touchLocked=true;gesture=null;}
 else{plan.touchLocked=false;gesture=null;}
 refreshPaintGuide();queueDraw();
}
function onPointerDown(e){
 if(!state||mapInputBlocked())return;
 if(attackPlanner){
  const plan=attackPlanner;if(!['paint','erase'].includes(plan.mode))return;
  canvas.setPointerCapture(e.pointerId);
  pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pressed.size>=2){
   plan.touchLocked=true;if(plan.mode==='erase'&&plan.eraseBefore)plan.cells=new Set(plan.eraseBefore);plan.pointerId=null;plan.lastPoint=null;
   plan.strokeStart=null;plan.strokeOrigin=null;plan.brushPoint=null;
   if(pressed.size===2)beginPaintNavigation();
  }else if(!plan.touchLocked){
   if(plan.mode==='erase'){
    plan.eraseBefore=new Set(plan.cells);plan.erasable=new Set([...(state.attackPlans||[]),...(state.recoveryPlans||[])].filter(p=>p.owner===myId).flatMap(p=>p.zoneCells));
   }
   const pt=gridAt(e.clientX,e.clientY);
   plan.pointerId=e.pointerId;plan.lastPoint=null;
   plan.strokeStart=E.inside(pt.x,pt.y)?pt:null;
   plan.strokeOrigin={x:e.clientX,y:e.clientY};
   plan.brushPoint=plan.strokeStart;
  }
  refreshPaintGuide();queueDraw();return;
 }
 canvas.setPointerCapture(e.pointerId);
 pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pressed.size===1){
  pointerStart={x:e.clientX,y:e.clientY,camX,camY,moved:false};gesture=null;
 }else if(pressed.size===2){
  const v=[...pressed.values()],r=canvas.getBoundingClientRect(),cx=(v[0].x+v[1].x)/2-r.left,cy=(v[0].y+v[1].y)/2-r.top;
  gesture={dist:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),zoom,worldX:(cx-camX)/(TILE*zoom),worldY:(cy-camY)/(TILE*zoom)};
  pointerStart=null;
 }
}
function onPointerMove(e){
 if(mapInputBlocked())return;
 if(attackPlanner){
  const plan=attackPlanner;if(!pressed.has(e.pointerId))return;
  pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pressed.size>=2){updatePaintNavigation();return;}
  if(plan.touchLocked||plan.pointerId!==e.pointerId)return;
  if(!plan.lastPoint&&plan.strokeOrigin&&Math.hypot(e.clientX-plan.strokeOrigin.x,e.clientY-plan.strokeOrigin.y)<6)return;
  if(!plan.lastPoint&&plan.strokeStart)paintAtPointer(plan.strokeStart);
  paintAtPointer(gridAt(e.clientX,e.clientY));queueDraw();return;
 }
 if(defensePicking&&!pressed.size){focusHover=gridAt(e.clientX,e.clientY);queueDraw();}
 if(buildMode&&state?.phase==='playing'){
  const cell=gridAt(e.clientX,e.clientY);
  if(E.inside(cell.x,cell.y)&&(moveCursor?.x!==cell.x||moveCursor?.y!==cell.y)){
   moveCursor=cell;queueDraw();
  }
 }
 if(!pressed.has(e.pointerId))return;
 pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pressed.size===2&&gesture){
  const vals=[...pressed.values()],r=canvas.getBoundingClientRect();
  zoom=Math.max(.2,Math.min(5,gesture.zoom*Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y)/Math.max(1,gesture.dist)));
  camX=(vals[0].x+vals[1].x)/2-r.left-gesture.worldX*TILE*zoom;
  camY=(vals[0].y+vals[1].y)/2-r.top-gesture.worldY*TILE*zoom;
  clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();return;
 }
 if(pointerStart){
  const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
  if(Math.hypot(dx,dy)>(e.pointerType==='touch'?11:6))pointerStart.moved=true;
  if(pointerStart.moved){camX=pointerStart.camX+dx;camY=pointerStart.camY+dy;clampCamera();queueDraw();}
 }
}
function onPointerUp(e){
 if(mapInputBlocked()){pressed.delete(e.pointerId);pointerStart=null;gesture=null;return;}
 if(attackPlanner){finishPaintPointer(e);return;}
 const was=pointerStart,touch=pressed.size;
 pressed.delete(e.pointerId);
 if(touch===1){
  pointerStart=null;
  if(was&&!was.moved){const now=Date.now(),g=gridAt(e.clientX,e.clientY),friendly=E.inside(g.x,g.y)&&E.owner(state,g.x,g.y)===myId;if(friendly&&!defensePicking&&!target&&!buildMode&&now-lastTap<280){const p=pixelAt(e.clientX,e.clientY);zoomAt(1.45,p.x,p.y);lastTap=0;}else{selectMap(e.clientX,e.clientY);lastTap=friendly?now:0;}}
 }else{pointerStart=null;gesture=null;}
}
// Prevent accidental text selection during tap, long-press, and drag gameplay.
document.addEventListener('selectstart',e=>{
 if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault();
});
canvas.addEventListener('pointerdown',onPointerDown);
canvas.addEventListener('pointermove',onPointerMove);
canvas.addEventListener('pointerup',onPointerUp);
canvas.addEventListener('pointercancel',e=>{if(attackPlanner){finishPaintPointer(e,true);return;}pressed.delete(e.pointerId);pointerStart=null;gesture=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(mapInputBlocked())return;const p=pixelAt(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.13:.885,p.x,p.y);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('zoomIn').onclick=()=>zoomAt(1.24,canvas.clientWidth/2,canvas.clientHeight/2);$('zoomOut').onclick=()=>zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);function fitWorld(){hideAux();zoom=Math.min((canvas.clientWidth-16)/(E.W*TILE),(canvas.clientHeight-16)/(E.H*TILE));camX=(canvas.clientWidth-E.W*TILE*zoom)/2;camY=(canvas.clientHeight-E.H*TILE*zoom)/2;$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*E.W,y=(e.clientY-r.top)/r.height*E.H;camX=canvas.clientWidth/2-x*TILE*zoom;camY=canvas.clientHeight/2-y*TILE*zoom;clampCamera();queueDraw();});mini.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fitWorld();}});
// Low-resolution territory bitmap: one pixel per world tile. The GPU enlarges it.
// It is updated only when a territory changes, NOT once per animation frame.
const TERRAIN_RGB=[[56,145,165],[113,152,80],[58,125,75],[150,144,115],[154,183,97],[149,116,68],[156,164,155]];
let minimapCached=null,pixelLayer=null;
let mapPaintOwners=null;
function repaintWorld(){
 if(!state?.owners?.length||!state?.tiles?.length)return 0;
 const revision=state.territoryRevision??state.tick;
 if(worldLayer&&paintedRevision===revision&&terrainSeed===state.seed)return 0;
 const full=!worldLayer||terrainSeed!==state.seed||!mapPaintOwners||paintedRevision<0;
 if(!worldLayer){worldLayer=document.createElement('canvas');worldLayer.width=E.W*6;worldLayer.height=E.H*6;}
 const owners=state.owners,tiles=state.tiles,dirty=new Set();
 if(full)for(let i=0;i<owners.length;i++)dirty.add(i);
 else for(let i=0;i<owners.length;i++)if(owners[i]!==mapPaintOwners[i]){
  dirty.add(i);const x=i%E.W,y=(i/E.W)|0;
  if(x)dirty.add(i-1);if(x<E.W-1)dirty.add(i+1);if(y)dirty.add(i-E.W);if(y<E.H-1)dirty.add(i+E.W);
 }
 const wc=worldLayer.getContext('2d',{alpha:false});wc.imageSmoothingEnabled=false;const colors=Object.fromEntries(state.players.map(p=>{const v=parseInt(p.color.slice(1),16);return[p.id,[(v>>>16)&255,(v>>>8)&255,v&255]];}));
 // Paint only changed ownership cells and adjacent boundary cells. The resource
 // pattern is deterministic, so overwriting a cell restores its exact terrain.
 for(const i of dirty){const x=i%E.W,y=(i/E.W)|0,t=tiles[i],terr=TERRAIN_RGB[t]||TERRAIN_RGB[1],col=colors[owners[i]],k=col?(t===1?.38:.25):0;
  let h=Math.imul(x+state.seed*3,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);
  const shade=(((h>>>24)&15)-7)*(t===0?.66:.27);
  wc.fillStyle='rgb('+terr.map((v,j)=>Math.max(0,Math.min(255,Math.round(v*(1-k)+(col?.[j]||0)*k+shade)))).join(',')+')';wc.fillRect(x*6,y*6,6,6);
  if(!t){
   if(tinyTerrain.water?.naturalWidth&&((x*31+y*47+state.seed)%8===0)){
    wc.save();wc.globalAlpha=.33;wc.drawImage(tinyTerrain.water,0,0,64,64,x*6,y*6,6,6);wc.restore();
   }
   if((x*41+y*73+state.seed*13)%19===0){wc.fillStyle='#b2e8f0b0';wc.fillRect(x*6+2,y*6+2,2,1);}
   continue;
  }
  if(tinyTerrain.grass?.naturalWidth&&((x*17+y*11+state.seed)%3===0)){
   wc.save();wc.globalAlpha=.23;
   wc.drawImage(tinyTerrain.grass,((x+y)%4)*64,64,64,64,x*6,y*6,6,6);
   wc.restore();
  }
  if(x===0||y===0||x===E.W-1||y===E.H-1||((x*41+y*73+state.seed*13)%5))continue;
  const px=x*6+3,py=y*6+3;
  if(t===2){
   if(tinyTerrain.tree?.naturalWidth)wc.drawImage(tinyTerrain.tree,0,0,192,256,px-3,py-3,6,6);
   else{wc.fillStyle='#327c42';wc.fillRect(px-2,py-1,3,4);wc.fillRect(px+1,py-2,2,5);}
  }
  else if(t===3||t===6){
   if(tinyTerrain.rock?.naturalWidth)wc.drawImage(tinyTerrain.rock,0,0,Math.min(64,tinyTerrain.rock.naturalWidth),Math.min(64,tinyTerrain.rock.naturalHeight),px-3,py-3,6,6);
   else{wc.strokeStyle='#e4e3bf';wc.lineWidth=.9;wc.beginPath();wc.moveTo(px-2,py+1);wc.lineTo(px,py-2);wc.lineTo(px+2,py+1);wc.stroke();}
  }
  else if(t===4){wc.fillStyle='#e9c96e';wc.fillRect(px-2,py,4,1);}
  else if(t===5){wc.fillStyle='#ffd54a';wc.fillRect(px-1,py-2,2,2);}
 }
 // Batch actual boundaries by owner; never issue an empty stroke per land cell.
 const rims=new Map();
 for(const i of dirty){const id=owners[i];if(!id)continue;const x=i%E.W,y=(i/E.W)|0;
  let p=rims.get(id);if(!p){p=new Path2D();rims.set(id,p);}
  if(x===0||owners[i-1]!==id){p.moveTo(x*6,y*6+.3);p.lineTo(x*6,(y+1)*6-.3);}
  if(y===0||owners[i-E.W]!==id){p.moveTo(x*6+.3,y*6);p.lineTo((x+1)*6-.3,y*6);}
  if(x===E.W-1||owners[i+1]!==id){p.moveTo((x+1)*6,y*6+.3);p.lineTo((x+1)*6,(y+1)*6-.3);}
  if(y===E.H-1||owners[i+E.W]!==id){p.moveTo(x*6+.3,(y+1)*6);p.lineTo((x+1)*6-.3,(y+1)*6);}
 }
 wc.lineWidth=.55;for(const [id,path] of rims){wc.strokeStyle=color(id);wc.stroke(path);}
 mapPaintOwners=Uint8Array.from(owners);terrainSeed=state.seed;paintedRevision=revision;if(dirty.size)miniRevision=-1;
 return dirty.size;
}

function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function drawFortRange(x,y,preview){
 const b=state.buildings.find(b=>b.kind==='fort'&&b.x===x&&b.y===y)||{x,y,level:1};
 ctx.save();ctx.strokeStyle=preview?'#93e3f0':'#77c4df88';ctx.lineWidth=1/zoom;ctx.fillStyle=preview?'#64c9e51c':'#64c9e508';
 ctx.beginPath();ctx.arc((x+.5)*TILE,(y+.5)*TILE,E.fortRadius(b,state)*TILE,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}

let armyDisplayCache=null;
function getArmyDisplay(){
 const current=state.armies||[],home=mine()?.garrisons;
 if(armyDisplayCache&&armyDisplayCache.state===state&&armyDisplayCache.armies===current&&armyDisplayCache.count===current.length&&armyDisplayCache.home===home&&armyDisplayCache.tick===state.tick&&armyDisplayCache.revision===state.territoryRevision)return armyDisplayCache;
 const paths=new Map(),transfers=new Map(),old=armyDisplayCache;
 const addEdge=(owner,strength,x1,y1,x2,y2)=>{
  const level=Math.max(1,Math.min(4,Math.ceil(Math.log2(1+strength/50)/2))),key=owner+':'+level;
  let group=paths.get(key);if(!group){group={owner,level,path:new Path2D(),segments:0};paths.set(key,group);}
  group.path.moveTo(x1*TILE,y1*TILE);group.path.lineTo(x2*TILE,y2*TILE);group.segments++;
 };
 const addTransfer=(c,owner,order)=>{
  if(c.strength<1||c.x===c.tx&&c.y===c.ty||!Number.isFinite(c.tx))return;
  const key=owner+':'+order+':'+Math.floor(c.x/10)+':'+Math.floor(c.y/10)+':'+Math.floor(c.tx/10)+':'+Math.floor(c.ty/10);
  const existing=transfers.get(key);
  if(existing){existing.strength+=c.strength;if(c.strength>existing.sample){existing.x=c.x;existing.y=c.y;existing.tx=c.tx;existing.ty=c.ty;existing.sample=c.strength;}}
  else transfers.set(key,{key,owner,x:c.x,y:c.y,tx:c.tx,ty:c.ty,strength:c.strength,sample:c.strength});
 };
 for(const a of current){
  if(a.strength<=0)continue;
  for(const t of a.sectors||[]){
   const strength=E.localAttackStrength(a,t.cells[0]);if(strength<1)continue;
   for(const i of t.cells){
    if(state.owners[i]===a.owner)continue;
    const x=i%E.W,y=(i/E.W)|0;
    if(x>0&&state.owners[i-1]===a.owner)addEdge(a.owner,strength,x,y,x,y+1);
    if(x<E.W-1&&state.owners[i+1]===a.owner)addEdge(a.owner,strength,x+1,y,x+1,y+1);
    if(y>0&&state.owners[i-E.W]===a.owner)addEdge(a.owner,strength,x,y,x+1,y);
    if(y<E.H-1&&state.owners[i+E.W]===a.owner)addEdge(a.owner,strength,x,y+1,x+1,y+1);
   }
  }
  for(const c of a.columns||[])addTransfer(c,a.owner,a.planId||a.id);
 }
 const guards=(home||[]).filter(g=>g.role==='Guard'&&!g.returning),cells=new Set();
 for(const g of guards){
  addTransfer(g,myId,'guard');
  for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
   const x=g.x+dx,y=g.y+dy;if(Math.abs(dx)+Math.abs(dy)>6||!E.inside(x,y))continue;
   const i=y*E.W+x;if(state.owners[i]===myId)cells.add(i);
  }
 }
 for(const i of cells){
  const x=i%E.W,y=(i/E.W)|0,strength=guards.reduce((n,g)=>n+g.strength*Math.max(0,1-(Math.abs(g.x-x)+Math.abs(g.y-y))/7),0);
  const hostile=(nx,ny)=>{const id=E.owner(state,nx,ny);return id&&id!==myId&&fighting(id);};
  if(x>0&&hostile(x-1,y))addEdge(myId,strength,x,y,x,y+1);
  if(x<E.W-1&&hostile(x+1,y))addEdge(myId,strength,x+1,y,x+1,y+1);
  if(y>0&&hostile(x,y-1))addEdge(myId,strength,x,y,x+1,y);
  if(y<E.H-1&&hostile(x,y+1))addEdge(myId,strength,x,y+1,x+1,y+1);
 }
 for(const g of home||[])if(g.role!=='Guard')addTransfer(g,myId,g.returning?'return':'reserve');
 const previous=new Map((old?.arrows||[]).map(a=>[a.key,a]));
 const arrows=[...transfers.values()].sort((a,b)=>b.strength-a.strength);
 for(const a of arrows){const p=previous.get(a.key),near=p&&Math.abs(p.x-a.x)+Math.abs(p.y-a.y)<=3;
  a.fromX=near?p.x:a.x;a.fromY=near?p.y:a.y;
 }
 armyDisplayCache={state,armies:current,count:current.length,home,tick:state.tick,revision:state.territoryRevision,paths:[...paths.values()],arrows,createdAt:performance.now()};
 return armyDisplayCache;
}
let infrastructureCache=null,unitCellCache=null;
function drawInfrastructure(){
 const zones=[],roads=state.roads||[];
 if(!infrastructureCache||infrastructureCache.seed!==state.seed||infrastructureCache.myId!==myId||infrastructureCache.length!==roads.length||infrastructureCache.roadRevision!==state.roadRevision||infrastructureCache.revision!==state.workRevision||(zones||[]).length!==infrastructureCache.zoneCells.length||(zones||[]).some((z,i)=>z.zoneCells!==infrastructureCache.zoneCells[i])){
  const paths=new Map(),roadPath=new Path2D();
  for(const z of zones||[]){let path=paths.get(z.resource);if(!path){path=new Path2D();paths.set(z.resource,path);}if(z.owner===myId)for(const i of z.zoneCells)path.rect(i%E.W*TILE,((i/E.W)|0)*TILE,TILE,TILE);}
  const connected=new Set(roads);
  // Cached, continuous centerlines: preserve strategic visibility without tile-sized boxes.
  for(const i of roads){
   const x=i%E.W,y=(i/E.W)|0,cx=(x+.5)*TILE,cy=(y+.5)*TILE;
   if(x<E.W-1&&connected.has(i+1)){roadPath.moveTo(cx,cy);roadPath.lineTo(cx+TILE,cy);}
   if(y<E.H-1&&connected.has(i+E.W)){roadPath.moveTo(cx,cy);roadPath.lineTo(cx,cy+TILE);}
   roadPath.moveTo(cx+.5,cy);roadPath.arc(cx,cy,.5,0,Math.PI*2);
  }
  infrastructureCache={seed:state.seed,myId,zoneCells:(zones||[]).map(z=>z.zoneCells),length:roads.length,roadRevision:state.roadRevision,revision:state.workRevision,paths,roadPath};
 }
 ctx.save();ctx.globalAlpha=.18;
 const shades={food:'#a7cf78',wood:'#54bc94',stone:'#c7cfdb',gold:'#e8ca70'};
 for(const [r,path] of infrastructureCache.paths){ctx.fillStyle=shades[r];ctx.fill(path);}
 if(roads.length){
  ctx.globalAlpha=zoom<.5?.45:zoom<.9?.76:.92;
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.strokeStyle='#473e30';ctx.lineWidth=TILE*.37;ctx.stroke(infrastructureCache.roadPath);
  ctx.strokeStyle='#e7cb8d';ctx.lineWidth=TILE*.22;ctx.stroke(infrastructureCache.roadPath);
 }ctx.restore();
}
function drawHarvestSites(w,h){
 const p=mine();if(!p)return;const colors={food:'#d6e88c',wood:'#7ae0aa',stone:'#d8e2ee',gold:'#ffdc71'};
 ctx.save();for(const g of p.workers||[]){
  if(!colors[g.resource]||(g.progress||0)<3||g.x!==g.tx||g.y!==g.ty||g.job||E.owner(state,g.x,g.y)!==myId||buildingCells().has(g.y*E.W+g.x))continue;
  const x=g.x*TILE,y=g.y*TILE;if(x*zoom+camX>w||y*zoom+camY>h||(x+TILE)*zoom+camX<0||(y+TILE)*zoom+camY<0)continue;
  ctx.globalAlpha=.9;ctx.strokeStyle=colors[g.resource];ctx.lineWidth=1.5/zoom;ctx.strokeRect(x+1,y+1,TILE-2,TILE-2);
 }ctx.restore();
}
let buildingCellCache=null;
function buildingCells(){if(!buildingCellCache||buildingCellCache.source!==state.buildings||buildingCellCache.length!==state.buildings.length)buildingCellCache={source:state.buildings,length:state.buildings.length,cells:new Set(state.buildings.filter(b=>E.visibleBuilding(state,myId,b)).map(b=>b.y*E.W+b.x))};return buildingCellCache.cells;}
function drawArmyDisplay(w,h){
 // Shade occupied cells. One draw per group/cell; no icons or animated arrows.
 ctx.save();
 let cells=unitCellCache?.cells;
 if(!unitCellCache||unitCellCache.state!==state||unitCellCache.armies!==state.armies||unitCellCache.tick!==state.tick){
 cells=new Map();
 const add=(owner,g,civilian)=>{if((g.strength??g.count??0)<=0)return;const key=owner+':'+g.x+':'+g.y+':'+civilian;
  const old=cells.get(key);if(old)old.strength+=g.strength||g.count;else cells.set(key,{owner,x:g.x,y:g.y,civilian,strength:g.strength||g.count});};
 for(const p of state.players){for(const g of p.garrisons||[])add(p.id,g,false);for(const g of p.workers||[])add(p.id,g,true);}
 for(const a of state.armies)for(const c of a.columns||[])add(a.owner,c,false);
 unitCellCache={state,armies:state.armies,tick:state.tick,cells};
 }
 for(const c of cells.values()){
  if(buildingCells().has(c.y*E.W+c.x))continue;
  const x=c.x*TILE,y=c.y*TILE;if(x*zoom+camX>w||y*zoom+camY>h||(x+TILE)*zoom+camX<0||(y+TILE)*zoom+camY<0)continue;
  ctx.fillStyle=c.civilian?'#e9d6a0':color(c.owner);ctx.globalAlpha=c.civilian?.85:Math.min(.95,.4+Math.log2(1+c.strength)/24);
  const inset=c.civilian?.28:.08;ctx.fillRect(x+TILE*inset,y+TILE*inset,TILE*(1-2*inset),TILE*(1-2*inset));
 }
 for(const j of state.buildJobs||[])if(j.owner===myId){ctx.globalAlpha=.8;ctx.strokeStyle='#e9d6a0';ctx.lineWidth=1/zoom;ctx.strokeRect(j.x*TILE,j.y*TILE,TILE,TILE);}
 ctx.restore();
}

// Labels follow the country's remaining owned land after its capital falls.
let nationLabelCache=null;
function nationLabelAnchors(snapshot=state){
 const roster=snapshot.players.map(p=>[p.id,p.name,p.color,p.eliminated,p.capital?.x,p.capital?.y].join(':')).join('|');
 if(nationLabelCache?.seed===snapshot.seed&&nationLabelCache.revision===snapshot.territoryRevision&&nationLabelCache.roster===roster)return nationLabelCache.anchors;
 const owners=snapshot.owners,seen=new Uint8Array(owners.length),regions=new Map(),anchors=[];
 for(let start=0;start<owners.length;start++){
  const id=owners[start];if(!id||seen[start])continue;
  const cells=[start];seen[start]=1;let sx=0,sy=0;
  for(let k=0;k<cells.length;k++){
   const i=cells[k],x=i%E.W,y=(i/E.W)|0;sx+=x;sy+=y;
   for(const n of [x>0?i-1:-1,x<E.W-1?i+1:-1,y>0?i-E.W:-1,y<E.H-1?i+E.W:-1])
    if(n>=0&&!seen[n]&&owners[n]===id){seen[n]=1;cells.push(n);}
  }
  if(cells.length>(regions.get(id)?.cells.length||0))regions.set(id,{cells,cx:sx/cells.length,cy:sy/cells.length});
 }
 for(const p of snapshot.players){
  if(p.eliminated||!p.land)continue;
  const group=regions.get(p.id);if(!group)continue;
  const cap=p.capital,capIndex=cap&&E.inside(cap.x,cap.y)?cap.y*E.W+cap.x:-1;
  const intact=capIndex>=0&&owners[capIndex]===p.id&&snapshot.buildings.some(b=>b.kind==='capital'&&b.owner===p.id&&b.x===cap.x&&b.y===cap.y);
  let index=capIndex;
  if(!intact){
   let best=Infinity;
   for(const i of group.cells){const dx=i%E.W-group.cx,dy=((i/E.W)|0)-group.cy,d=dx*dx+dy*dy;
    if(d<best){best=d;index=i;}
   }
  }
  anchors.push({id:p.id,name:p.name,color:p.color,cell:index,x:(index%E.W+.5)*TILE,y:(((index/E.W)|0)+.5)*TILE});
 }
 nationLabelCache={seed:snapshot.seed,roster,revision:snapshot.territoryRevision,anchors};
 return anchors;
}
// Existing Kenney Tiny Town CC0 tiles form original, readable pixel buildings.
// The shared vector glyph remains a fallback until its sprite finishes loading.
// Render the eight distinct building images already committed to this project.
const mapBuildingSprites=Object.create(null);
if(typeof Image==='function')for(const kind of BUILDING_KINDS){
 const sprite=new Image();mapBuildingSprites[kind]=sprite;
 sprite.onload=()=>{roofSpriteCache.clear();queueDraw();const dock=$('buildDock');if(state?.phase==='playing'&&dock?.dataset.ready==='yes'){delete dock.dataset.ready;refreshQuickBuild();}};
 sprite.src=buildingSpritePath(kind);
}

// Tiny Swords old CC0 terrain sheets; no new mechanics. Off-screen world bitmap
// is repainted only for changed cells, never per animation frame.
const tinyTerrain=Object.create(null);
if(typeof Image==='function')for(const id of ['grass','forest','water','tree','rock']){
 const img=new Image();tinyTerrain[id]=img;
 img.onload=()=>{paintedRevision=-1;queueDraw();};
 img.src=OLD_CC0+'terrain/'+id+'.png';
}

/* Only the blue roof pigments are changed. Neutral stone, wooden beams and
   transparent pixels retain the original Pixel Frog art. Cache by source, owner
   color and level, so Canvas never calls getImageData per animation frame. */
const roofSpriteCache=new Map();
const roofBasePixels=new Map();
const ROOF_LEVELS=[
 {brightness:.84,saturation:.65},
 {brightness:.96,saturation:.78},
 {brightness:1.08,saturation:.9},
 {brightness:1.2,saturation:1.04}
];
const clamp01=x=>Math.max(0,Math.min(1,x));
function rgbHue(r,g,b){
 const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 if(!d)return 0;
 let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 return ((h*60)%360+360)%360;
}
function hsvRGB(h,s,v){
 const chroma=v*s,offset=h/60,second=chroma*(1-Math.abs(offset%2-1)),low=v-chroma;
 const group=Math.floor(offset)%6;
 const [r,g,b]=[[chroma,second,0],[second,chroma,0],[0,chroma,second],[0,second,chroma],[second,0,chroma],[chroma,0,second]][group];
 return [Math.round((r+low)*255),Math.round((g+low)*255),Math.round((b+low)*255)];
}
function roofBase(kind){
 const src=mapBuildingSprites[kind],file=buildingSpriteFile(kind);
 if(!src?.naturalWidth||!src.naturalHeight)return null;
 const known=roofBasePixels.get(file);
 if(known&&known.width===src.naturalWidth&&known.height===src.naturalHeight)return known;
 const canvas=document.createElement('canvas');canvas.width=src.naturalWidth;canvas.height=src.naturalHeight;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!context)return null;
 context.drawImage(src,0,0);
 const pixels=context.getImageData(0,0,canvas.width,canvas.height);
 const mask=[];
 for(let i=0;i<pixels.data.length;i+=4){
  const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
  // All old-pack roofs use cyan/blue shingle pigments. The neutral and
  // golden wall materials are excluded, as are dark outlines and transparency.
  if(pixels.data[i+3]>=96&&b>=64&&b>r+13&&b>g+2&&g>=r-28)mask.push(i);
 }
 const base={width:canvas.width,height:canvas.height,pixels,mask};
 roofBasePixels.set(file,base);return base;
}
function roofSprite(kind,owner,level=1){
 const src=mapBuildingSprites[kind];
 if(!src?.naturalWidth||owner==null)return src;
 const hex=color(owner),key=buildingSpriteFile(kind)+'|'+hex+'|'+Math.min(4,Math.max(1,level|0));
 if(roofSpriteCache.has(key))return roofSpriteCache.get(key);
 try{
  const base=roofBase(kind);
  if(!base)return src;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  if(!Number.isFinite(r+g+b))return src;
  const hue=rgbHue(r,g,b),saturation=(Math.max(r,g,b)-Math.min(r,g,b))/Math.max(1,Math.max(r,g,b));
  const tier=ROOF_LEVELS[Math.min(3,Math.max(0,(level|0)-1))];
  const out=new Uint8ClampedArray(base.pixels.data);
  for(const i of base.mask){
   const rr=out[i],gg=out[i+1],bb=out[i+2],originalMax=Math.max(rr,gg,bb);
   const sat=clamp01((.38+.36*saturation+.14*(originalMax-Math.min(rr,gg,bb))/255)*tier.saturation);
   const value=clamp01(originalMax/255*tier.brightness);
   const next=hsvRGB(hue,sat,value);
   out[i]=next[0];out[i+1]=next[1];out[i+2]=next[2];
  }
  const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
  canvas.getContext('2d').putImageData(new ImageData(out,base.width,base.height),0,0);
  if(roofSpriteCache.size>127)roofSpriteCache.clear();
  roofSpriteCache.set(key,canvas);return canvas;
 }catch(e){return src;}
}
function buildingRoofUrl(kind,owner=null,level=1){
 if(owner==null)return buildingSpritePath(kind);
 const result=roofSprite(kind,owner,level);
 if(result?.toDataURL){try{return result.toDataURL('image/png');}catch(e){}}
 return buildingSpritePath(kind);
}
// Building type remains identifiable by shape and text. Country hue and level
// tint the original roof pigment only; level numbers remain readable without color.
const buildingTypeMarkers=new Map();
function drawUpgradeWork(b,x,y){
 if(!b.upgrade||b.owner!==myId)return;
 const job=(state.buildJobs||[]).find(j=>j.id===b.upgrade.jobId);
 const total=Math.max(1,b.upgrade.total||E.upgradeTime(b)),fraction=Math.max(0,Math.min(1,(job?.progress??b.upgrade.progress??0)/total));
 const scale=1/Math.max(.15,zoom),w=28*scale,h=14*scale,top=y+TILE*.68;
 ctx.fillStyle='#0e1c29';ctx.fillRect(x-w/2,top,w,h);
 ctx.fillStyle='#f1f6fa';ctx.font=`bold ${8*scale}px system-ui`;ctx.fillText('UP',x,top+5*scale);
 ctx.fillStyle='#536170';ctx.fillRect(x-w/2+2*scale,top+10*scale,w-4*scale,2*scale);
 ctx.fillStyle='#f5f7fb';ctx.fillRect(x-w/2+2*scale,top+10*scale,(w-4*scale)*fraction,2*scale);
}
function buildingTypeMarker(kind,owner){
 const key=kind+'|'+owner;
 if(buildingTypeMarkers.has(key))return buildingTypeMarkers.get(key);
 const icon=document.createElement('canvas');icon.width=44;icon.height=44;
 const c=icon.getContext('2d');c.clearRect(0,0,44,44);
 c.fillStyle='#192838';c.fillRect(1,1,42,42);
 c.fillStyle=owner||'#dce6f0';c.fillRect(1,1,42,5);
 const path=buildingPaths[kind]||buildingPaths.city;
 c.save();c.translate(11,9);c.scale(22/(kind==='capital'?64:512),22/(kind==='capital'?64:512));
 c.fillStyle='#f2f6fb';c.fill(path,'evenodd');c.restore();
 c.font='bold 11px system-ui';c.textAlign='center';c.textBaseline='middle';
 c.fillStyle='#ffffff';c.fillText(BUILDING_CODES[kind]||'BL',22,35);
 buildingTypeMarkers.set(key,icon);return icon;
}
function drawMapBuilding(b,x,y,overviewCount=1){
 const kind=b.kind,source=roofSprite(kind,b.owner,b.level),loaded=!!(source?.naturalWidth||source?.width);
 const ownerColor=color(b.owner);
 const macro=zoom<1.35,far=zoom<.55;
 const screenH=macro?(far?20:26):Math.min(76,Math.max(36,TILE*zoom*1.4));
 const h=(kind==='capital'?screenH*1.15:screenH)/zoom,w=h*(loaded?(source.naturalWidth||source.width)/(source.naturalHeight||source.height):1);
 // Snap sprite geometry to physical screen pixels, eliminating subpixel shimmer.
 const dpr=canvas.width/Math.max(1,canvas.clientWidth);
 const snapX=v=>(Math.round((v*zoom+camX)*dpr)/dpr-camX)/zoom;
 const snapY=v=>(Math.round((v*zoom+camY)*dpr)/dpr-camY)/zoom;
 const drawW=Math.max(1,Math.round(w*zoom*dpr)/dpr)/zoom,drawH=Math.max(1,Math.round(h*zoom*dpr)/dpr)/zoom;
 const baseX=snapX(x-drawW/2),baseY=snapY(y-drawH*.74);
 ctx.save();
 // Close zoom preserves the pixel sprite's silhouette; no opaque black tile.
 // Overview uses owner color, not building type, alongside the explicit type code.
 if(macro){
  ctx.save();ctx.globalAlpha=.15;ctx.fillStyle=ownerColor;
  ctx.fillRect(baseX-2/zoom,baseY-2/zoom,drawW+4/zoom,drawH+4/zoom);ctx.restore();
  ctx.strokeStyle=ownerColor;ctx.lineWidth=2/zoom;
  ctx.strokeRect(baseX-1/zoom,baseY-1/zoom,drawW+2/zoom,drawH+2/zoom);
 }else{
  ctx.fillStyle='#16303966';ctx.beginPath();
  ctx.ellipse(x,baseY+drawH,drawW*.48,drawH*.12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=ownerColor;ctx.fillRect(baseX+2/zoom,baseY+drawH-2/zoom,drawW-4/zoom,3/zoom);
 }
 if(loaded){ctx.imageSmoothingEnabled=false;ctx.drawImage(source,baseX,baseY,drawW,drawH);ctx.imageSmoothingEnabled=true;}
 else ctx.drawImage(buildingTypeMarker(kind,ownerColor),baseX,baseY,drawW,drawH);
 // Capital and City intentionally share the original castle silhouette;
 // the capital carries a pennant and taller footprint to remain identifiable.
 if(kind==='capital'){
  const flagW=9/zoom,flagH=15/zoom,flagX=x-drawW*.04,flagY=baseY-flagH*.45;
  ctx.strokeStyle='#10242c';ctx.lineWidth=2/zoom;
  ctx.beginPath();ctx.moveTo(flagX,flagY);ctx.lineTo(flagX,flagY+flagH);ctx.stroke();
  ctx.fillStyle=ownerColor;ctx.beginPath();ctx.moveTo(flagX,flagY);ctx.lineTo(flagX+flagW,flagY+flagH*.22);ctx.lineTo(flagX,flagY+flagH*.44);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f7f5da';ctx.lineWidth=1/zoom;ctx.stroke();
 }
 const labelW=(overviewCount>1?22:20)/zoom, labelH=macro?11/zoom:13/zoom;
 ctx.fillStyle='#12212de9';ctx.fillRect(x-labelW/2,baseY+drawH-labelH*.65,labelW,labelH);
 ctx.fillStyle='#f7f8fb';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`bold ${(macro?8:9)/zoom}px system-ui`;ctx.fillText(BUILDING_CODES[kind]||'BL',x,baseY+drawH-labelH*.13);
 if(overviewCount>1){
  const ww=18/zoom,hh=12/zoom;
  ctx.fillStyle='#ecf0f4';ctx.fillRect(x+drawW*.24,baseY-hh*.45,ww,hh);
  ctx.fillStyle='#132333';ctx.font=`bold ${8/zoom}px system-ui`;
  ctx.fillText(String(overviewCount),x+drawW*.24+ww/2,baseY+hh*.05);
 }else if(!far){
  const ww=14/zoom,hh=13/zoom;
  ctx.fillStyle='#f3eee2';ctx.fillRect(x+drawW*.24,baseY+drawH-hh*.4,ww,hh);
  ctx.fillStyle='#102032';ctx.font=`bold ${9/zoom}px system-ui`;
  ctx.fillText(String(b.level||1),x+drawW*.24+ww/2,baseY+drawH+hh*.09);
 }
 ctx.restore();drawUpgradeWork(b,x,y);
}
let worldBordersCache=null;
function worldBorderPaths(){
 const warKey=(state.wars||[]).join(',');
 if(worldBordersCache?.seed===state.seed&&worldBordersCache.revision===state.territoryRevision&&worldBordersCache.warKey===warKey)return worldBordersCache;
 const owners=new Path2D(),wars=new Path2D(),coast=worldBordersCache?.seed===state.seed?worldBordersCache.coast:new Path2D(),buildCoast=worldBordersCache?.seed!==state.seed;
 const edge=(path,x1,y1,x2,y2)=>{path.moveTo(x1*TILE,y1*TILE);path.lineTo(x2*TILE,y2*TILE);};
 const atWar=(a,b)=>a&&b&&a!==b&&(state.wars||[]).includes(Math.min(a,b)+':'+Math.max(a,b));
 for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
  const i=y*E.W+x,id=state.owners[i],tile=state.tiles[i];
  if(id){
   if(x===0||state.owners[i-1]!==id)edge(owners,x,y,x,y+1);
   if(y===0||state.owners[i-E.W]!==id)edge(owners,x,y,x+1,y);
   if(x===E.W-1||state.owners[i+1]!==id)edge(owners,x+1,y,x+1,y+1);
   if(y===E.H-1||state.owners[i+E.W]!==id)edge(owners,x,y+1,x+1,y+1);
   if(x<E.W-1&&atWar(id,state.owners[i+1]))edge(wars,x+1,y,x+1,y+1);
   if(y<E.H-1&&atWar(id,state.owners[i+E.W]))edge(wars,x,y+1,x+1,y+1);
  }
  if(tile&&buildCoast){
   if(x===0||!state.tiles[i-1])edge(coast,x,y,x,y+1);
   if(x===E.W-1||!state.tiles[i+1])edge(coast,x+1,y,x+1,y+1);
   if(y===0||!state.tiles[i-E.W])edge(coast,x,y,x+1,y);
   if(y===E.H-1||!state.tiles[i+E.W])edge(coast,x,y+1,x+1,y+1);
  }
 }
 worldBordersCache={seed:state.seed,revision:state.territoryRevision,warKey,owners,wars,coast};return worldBordersCache;
}
function draw(){if(!state?.tiles.length)return;repaintWorld();resize();const dpr=canvas.width/Math.max(1,canvas.clientWidth);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#3890a5';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(camX,camY);ctx.scale(zoom,zoom);ctx.imageSmoothingEnabled=zoom<.42;ctx.drawImage(worldLayer,0,0,worldLayer.width,worldLayer.height,0,0,E.W*TILE,E.H*TILE);
 if(zoom>=.28){
  const paths=worldBorderPaths();
  ctx.lineWidth=Math.max(.55,1.65/zoom);ctx.strokeStyle='#e6f3ffb0';ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(paths.owners);
  ctx.strokeStyle='#ff7488e6';ctx.lineWidth=Math.max(1.2,2.3/zoom);ctx.setLineDash([3/zoom,2/zoom]);ctx.lineCap='butt';ctx.stroke(paths.wars);ctx.setLineDash([]);
  ctx.strokeStyle='#f1edc29f';ctx.lineWidth=Math.max(.85,1.25/zoom);ctx.stroke(paths.coast);
 }
 const defense=defensePicking?(focusHover&&E.inside(focusHover.x,focusHover.y)?focusHover:mine()?.armyFocus):null;
 if(defense){ctx.strokeStyle=E.focusStatus(state,myId,defense)==='invalid'?'#ff617b':'#39d5ff';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.arc((defense.x+.5)*TILE,(defense.y+.5)*TILE,TILE*1.5,0,Math.PI*2);ctx.moveTo((defense.x-2)*TILE,(defense.y+.5)*TILE);ctx.lineTo((defense.x+3)*TILE,(defense.y+.5)*TILE);ctx.moveTo((defense.x+.5)*TILE,(defense.y-2)*TILE);ctx.lineTo((defense.x+.5)*TILE,(defense.y+3)*TILE);ctx.stroke();}

 // Fort scouting still works; range rings appear only while inspecting a fort or positioning one.
 drawInfrastructure();drawAttackPlanning();drawArmyDisplay(w,h);drawHarvestSites(w,h);
 // Low-detail overview groups nearby buildings by screen cell. Group count is
 // explicit; zooming reveals individual building artwork and numeric levels.
 const markerBins=zoom<1.35?new Map():null,markerList=[];
 for(const b of state.buildings){
  if(!E.visibleBuilding(state,myId,b))continue;
  const x=(b.x+.5)*TILE,y=(b.y+.5)*TILE;
  const sx=x*zoom+camX,sy=y*zoom+camY;
  if(sx<-65||sx>w+65||sy<-65||sy>h+65)continue;
  if(!markerBins){markerList.push({b,x,y,count:1});continue;}
  const size=zoom<.55?39:zoom<.95?34:30;
  const key=Math.floor(sx/size)+':'+Math.floor(sy/size);
  const existing=markerBins.get(key);
  if(!existing)markerBins.set(key,{b,x,y,count:1});
  else{
   existing.count++;
   if((BUILDING_PRIORITY[b.kind]||0)+(b.level||1)*.2>(BUILDING_PRIORITY[existing.b.kind]||0)+(existing.b.level||1)*.2){existing.b=b;existing.x=x;existing.y=y;}
  }
 }
 if(markerBins)markerList.push(...markerBins.values());
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const marker of markerList)drawMapBuilding(marker.b,marker.x,marker.y,marker.count);
 // Draw one name per surviving country, even after the capital becomes a city.
 // Full territorial flood-fill runs only when the territory revision changes.
 const labelBoxes=[];
 for(const place of nationLabelAnchors()){
  if(zoom<=.31)continue;
  const {x,y}=place;
  if(x*zoom+camX<-20||x*zoom+camX>w+20||y*zoom+camY<-20||y*zoom+camY>h+20)continue;
  const label=place.id+' · '+place.name.slice(0,20);
  ctx.font='750 '+Math.max(9,11/zoom)+'px system-ui';
  const tw=ctx.measureText(label).width+20/zoom,lh=20/zoom,ly=y-14/zoom;
  const box={x:x-tw/2,y:ly-lh/2,w:tw,h:lh};
  if(labelBoxes.some(r=>box.x<r.x+r.w&&box.x+box.w>r.x&&box.y<r.y+r.h&&box.y+box.h>r.y))continue;
  labelBoxes.push(box);
  ctx.fillStyle='#101218f2';ctx.strokeStyle=place.color;ctx.lineWidth=1.2/Math.max(.5,zoom);
  ctx.beginPath();ctx.roundRect(box.x,box.y,tw,lh,8/Math.max(.5,zoom));ctx.fill();ctx.stroke();
  ctx.fillStyle='#f1f5fa';ctx.fillText(label,x,ly);
 }

 if(selected?.kind==='building'){const b=selected.kind==='building'?state.buildings.find(v=>v.id===selected.id):state.armies.find(v=>v.id===selected.id);if(b){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(b.x*TILE-5,b.y*TILE-5,TILE+10,TILE+10);ctx.setLineDash([]);}}
 if(buildMode){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  const p=mine(),price=E.costBuilding(state,myId,buildMode)||{},affordable=Object.entries(price).every(([k,v])=>(p?.res[k]||0)>=v);
  const allowedColor=affordable?'rgba(111,244,126,.29)':'rgba(251,184,48,.26)';
  const blockedColor='rgba(231,65,70,.32)';
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   if(E.owner(state,x,y)!==myId)continue;
   ctx.fillStyle=E.canBuild(state,myId,buildMode,x,y)?blockedColor:allowedColor;
   ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
  }
  // Four-neighbour tile range is exactly Manhattan radius 4, matching tileDefense().
  if(buildMode==='fort'&&moveCursor&&E.inside(moveCursor.x,moveCursor.y))drawFortRange(moveCursor.x,moveCursor.y,true);
  if(moveCursor&&E.inside(moveCursor.x,moveCursor.y)){
   ctx.strokeStyle=E.canBuild(state,myId,buildMode,moveCursor.x,moveCursor.y)?'#f15d50':'#ecffe9';
   ctx.lineWidth=Math.max(2/Math.max(.5,zoom),1);
   ctx.strokeRect(moveCursor.x*TILE-2,moveCursor.y*TILE-2,TILE+4,TILE+4);
  }
 }
 // Display the selected existing fort's real defence range without entering build mode.
 if(selected?.kind==='building'){
  const b=state.buildings.find(v=>v.id===selected.id);
  if(b?.owner===myId&&b.kind==='fort')drawFortRange(b.x,b.y,false);
 }
 if(moveCursor){ctx.strokeStyle='#2c3139';ctx.lineWidth=1.5/Math.max(.5,zoom);ctx.strokeRect(moveCursor.x*TILE,moveCursor.y*TILE,TILE,TILE);}
 ctx.restore();drawMini();}
function drawMini(){
 if(!state?.owners?.length||!worldLayer||$('minimapWrap').classList.contains('minimized'))return;
 const revision=state.territoryRevision??state.tick;
 if(miniRevision!==revision){
  if(!minimapCached){minimapCached=document.createElement('canvas');minimapCached.width=E.W;minimapCached.height=E.H;}
  const mc=minimapCached.getContext('2d',{alpha:false});mc.imageSmoothingEnabled=true;mc.drawImage(worldLayer,0,0,E.W,E.H);
  miniRevision=revision;
 }
 mctx.clearRect(0,0,E.W,E.H);mctx.drawImage(minimapCached,0,0);
 mctx.save();mctx.scale(1/TILE,1/TILE);
 for(const group of getArmyDisplay().paths){mctx.strokeStyle=color(group.owner);mctx.lineWidth=TILE*.8;mctx.stroke(group.path);}
 mctx.restore();

 mctx.lineWidth=.65;mctx.strokeStyle='#ffffff';const scale=zoom*TILE;
 mctx.strokeRect(-camX/scale,-camY/scale,canvas.clientWidth/scale,canvas.clientHeight/scale);
}
// Safari: repeated taps must not trigger browser smart zoom. Keep both
// ordinary click events and intentional in-game map gestures intact.
document.addEventListener('dblclick',e=>{
 if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault();
},{passive:false});
window.addEventListener('resize',()=>{resize();clampCamera();queueDraw();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(defensePicking)exitArmyFocus();closeNations();toggleQuickBuild(false);if(attackPlanner)resetAttackPlanner();setThreatList(false);hideAux();setPreview(null);redirectArmy=null;if(panelOpen)closePanel();else cancelMode();$('tutorial').classList.add('hidden');return;}if(panelOpen&&window.innerWidth<851&&e.key==='Tab'){const items=[...$('sidebar').querySelectorAll('button:not([disabled]), select:not([disabled])')].filter(el=>el.offsetParent!==null);if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 if(!state||state.phase!=='playing'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoomAt(1.2,canvas.clientWidth/2,canvas.clientHeight/2);if(e.key==='-')zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);if(document.activeElement===canvas){if(!moveCursor)moveCursor=mine()?.capital?{...mine().capital}:{x:80,y:52};if(e.key.startsWith('Arrow')){e.preventDefault();const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];moveCursor.x=Math.max(0,Math.min(E.W-1,moveCursor.x+d[0]));moveCursor.y=Math.max(0,Math.min(E.H-1,moveCursor.y+d[1]));camX=canvas.clientWidth/2-(moveCursor.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(moveCursor.y+.5)*TILE*zoom;clampCamera();inspectCell(moveCursor.x,moveCursor.y);$('keyboardPosition').textContent=$('mapStatus').textContent;queueDraw();}if(e.key==='Enter'){e.preventDefault();const x=moveCursor.x,y=moveCursor.y;const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);}}});
function goHome(){exitArmyFocus();
 planningVisualCache=null;armyDisplayCache=null;
 if(serverActive||serverSocket)leaveServer();
 if(attackPlanner)resetAttackPlanner();
 if(demo&&state?.phase==='playing')saveSolo();
 clearTimeout(connectTimer);clearTimeout(reconnectTimer);clearTimeout(toastTimeout);
 const closingPeer=peer,closingConnections=[...connections.keys()];
 state=null;peer=null;upstream=null;host=false;demo=false;code='';myId=null;phaseShown='';
 connections.clear();previousOwners.clear();previousRevs.clear();lastSendTime.clear();pendingOrders.clear();tokenStore.clear();
 defeatDismissed=false;selected=null;buildMode=null;target=null;redirectArmy=null;pauseSolo=false;quickBuildOpen=false;hudNotice=null;lastSaveTick=-1;
 worldLayer=null;pixelLayer=null;paintedRevision=-1;activeThreats=[];
 setTimeout(()=>{for(const c of closingConnections){try{c.close();}catch(_){}}try{closingPeer?.destroy();}catch(_){}},150);
 closeNations();setThreatList(false);hideAux();closePanel();$('quickBuild').classList.add('hidden');$('placingBuild').classList.add('hidden');$('targetPreview').classList.add('hidden');$('tutorial').classList.add('hidden');$('victory').classList.add('hidden');$('battleDock').classList.add('collapsed');
 $('lobbyError').textContent='';$('gameToast').classList.add('hidden');setBusy(false);
 history.replaceState(null,'',location.pathname+location.search);show('lobby');
}
function openSession(){
 $('sessionPause').classList.toggle('hidden',!demo);
 $('sessionPause').textContent=pauseSolo?'Resume game':'Pause';
 $('sessionReconnect').classList.toggle('hidden',(!serverActive&&host)||demo||!state||!/RECONNECT|OFFLINE|DELAY|SYNC/.test($('networkStatus').textContent));
 $('sessionHint').textContent=(serverActive?'Server match. Rejoin on this device with the room code.':demo?'Paused. Your progress is saved when you leave.':host?'Host: leaving ends the match for everyone.':'Rejoin later on this device using the room code.')+' · Game '+(E.BUILD||'outdated — refresh required');
 showAux('sessionPanel');
 if(demo&&!$('sessionPanel').classList.contains('hidden')&&!pauseSolo){pauseSolo=true;menuPausedSolo=true;saveSolo();}
 $('sessionPause').textContent=pauseSolo?'Resume game':'Pause';
}
function requestExit(){
 if(!state||state.phase==='ended'||demo&&mine()?.eliminated)return goHome();
 if(demo&&saveSolo())return goHome();
 $('exitExplanation').textContent=serverActive?'Your kingdom stays in the match. Rejoin on this device using the room code.':demo?'Failed to save the match on this device. Leave without saving?':host?'You are the host. The match will end for everyone. Host transfer is unavailable.':'Your army will remain in the match. Rejoin on this device using the room code.';
 showAux('exitPanel');
}
async function inviteFriends(){
 const url=urlRoom();
 if(navigator.share){try{await navigator.share({title:'Brothers Kingdoms',text:'Join my match',url});return;}catch(e){if(e.name==='AbortError')return;}}
 copyText(url);
}
$('cancelConnect').onclick=goHome;
$('hostButton').onclick=createRoom;$('joinButton').onclick=joinRoom;$('demoButton').onclick=()=>createDemo(false);$('resumeButton').onclick=()=>createDemo(true);
$('leaveRoom').onclick=()=>{if(host)for(const c of connections.keys())try{c.send({t:'room-closed'});}catch(_){}goHome();};
$('startButton').onclick=startGame;$('copyLink').onclick=inviteFriends;$('copyCode').onclick=()=>copyText(code);
for(const id of ['hudTroops','hudFronts']){
 $(id).onclick=()=>openMilitary('army');
 $(id).onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMilitary('army');}};
}
function openResearch(){openPanel();$('scienceButton').setAttribute('aria-pressed','true');$('scienceButton').classList.add('chosen');updateUI();}
$('scienceButton').onclick=openResearch;
$('closeSession').onclick=hideAux;$('openLeaderboard').onclick=()=>showAux('quickLeadersPanel');$('closeQuickLeaders').onclick=hideAux;
function openLandLeaderboard(){showAux('quickLeadersPanel');}
$('hudLand').onclick=openLandLeaderboard;
$('hudLand').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLandLeaderboard();}};
$('sessionPause').onclick=()=>{menuPausedSolo=false;pauseSolo=false;hideAux();};
$('sessionReconnect').onclick=()=>{reconnectTries=0;retryUpstream();toast('Trying to reconnect');};
$('exitMatch').onclick=requestExit;$('cancelExit').onclick=openSession;
$('confirmExit').onclick=()=>{if(host&&!demo)for(const c of connections.keys())try{c.send({t:'room-closed'});}catch(_){}goHome();};
$('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();joinRoom();}});
$('nickname').addEventListener('change',()=>name());
$('soloBots').addEventListener('change',()=>{try{localStorage.setItem('bk-solo-bots',$('soloBots').value);}catch(_){}});
$('readyButton').onclick=()=>{readyLocal=!readyLocal;$('readyButton').setAttribute('aria-pressed',String(readyLocal));upstream?.send({t:'ready',value:readyLocal});};
for(const id of ['botCount'])$(id).onchange=()=>{if(host&&state?.phase==='lobby'){if(serverActive){serverSend({t:'settings',bots:Number($('botCount').value)});return;}state.settings={bots:Number($('botCount').value)};broadcast();}};

$('resultExit').onclick=requestExit;$('spectateMatch').onclick=()=>{defeatDismissed=true;phaseShown='playing';$('victory').classList.add('hidden');};
$('restart').onclick=()=>{
 if(serverActive){if(host&&state?.phase==='ended')serverSend({t:'rematch'});return;}
 if(demo){$('victory').classList.add('hidden');createDemo(false);return;}
 if(!host||state?.phase!=='ended')return;
 const roster=state.players.filter(p=>!p.bot).sort((a,b)=>a.id-b.id).map(p=>({id:p.id,name:p.name,connected:p.connected,color:p.color}));
 defeatDismissed=false;const bots=state.settings?.bots??0;state=E.lobby(Date.now());state.settings={bots};
 for(const p of roster){const id=E.addPlayer(state,p.name);Object.assign(E.person(state,id),p,{ready:true});}
 worldLayer=null;pixelLayer=null;paintedRevision=-1;selected=null;setPreview(null);cancelMode();hideAux();closePanel();$('victory').classList.add('hidden');phaseShown='';broadcast(true);
};
$('downloadSave').onclick=()=>{const blob=new Blob([JSON.stringify({tick:state.tick,winner:state.winner,players:state.players.map(p=>({name:p.name,land:p.land,kills:p.kills}))},null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='brothers-kingdoms-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
try{const previous=localStorage.getItem('bk-name');if(previous)$('nickname').value=previous;}catch(_){ }
try{const bots=localStorage.getItem('bk-solo-bots');if([...$('soloBots').options].some(o=>o.value===bots))$('soloBots').value=bots;}catch(_){}
const fromHash=location.hash.replace('#','').toUpperCase().replace(/[^A-Z0-9]/g,'');if(fromHash){$('roomCode').value=fromHash;$('lobbyError').textContent='Room invite '+fromHash+'. Enter your name and press Join.';if($('nickname').value.trim())joinRoom();else $('nickname').focus();}updateResume();
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveSolo();else if(serverActive&&Date.now()-lastStateAt>4500){reconnectTries=0;openServerSocket();}});
setInterval(()=>{if(demo&&state?.phase==='playing'&&!pauseSolo&&state.tick%10===0&&lastSaveTick!==state.tick){lastSaveTick=state.tick;saveSolo();}if(serverActive||!host||!state||state.phase!=='playing'||pauseSolo)return;E.tick(state);broadcast();},1000);
setInterval(()=>{if(!serverActive&&host&&state?.phase==='playing'&&!pauseSolo&&state.armies.length){E.combatStep(state);broadcast();}},333);
setInterval(()=>{if(!demo&&(!host||serverActive)&&state?.phase==='playing'&&Date.now()-lastStateAt>4500){setNetwork('CONNECTION DELAYED');}for(const [id,at] of pendingOrders)if(Date.now()-at>7000){pendingOrders.delete(id);toast('Order not confirmed. Check connection.');}},2000);
})();
