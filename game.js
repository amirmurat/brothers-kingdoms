/* Brothers Kingdoms Frontier — canvas world, realtime multiplayer and responsive command UI. */
(()=>{
'use strict';
const E=window.BKEngine,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Phosphor MIT icons for interface actions; shared geometric paths for buildings.
const UI_ICON_NAMES={food:'grains',wood:'tree',stone:'mountains',gold:'coins',farm:'grains',lumber:'tree',quarry:'mountains',mine:'coins',barracks:'sword',fort:'shield',city:'buildings',capital:'castle-turret',economy:'coins',war:'sword',logistics:'flag-banner'};
const uiIcon=name=>{
 if(name==='stone')return '<img class="ui-icon stone-resource-icon" src="assets/shapes/stone.svg" alt="" aria-hidden="true"/>';
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
const buildingArt=kind=>`<img class="building-art" src="assets/shapes/${kind}.svg" alt="" aria-hidden="true"/>`;
const buildingInfo={
 farm:{short:'Feeds your army.',detail:'+8 food/s per level',place:'Your land, excluding mountain summits',resource:'food',perLevel:8},
 lumber:{short:'Produces wood for development.',detail:'+7 wood/s per level',place:'Forests only',resource:'wood',perLevel:7},
 quarry:{short:'Produces stone for buildings.',detail:'+7 stone/s per level',place:'Hills or mountains',resource:'stone',perLevel:7},
 mine:{short:'Produces gold for research.',detail:'+7 gold/s per level',place:'Ore, hills, or mountains',resource:'gold',perLevel:7},
 barracks:{short:'Increases army capacity.',detail:'+430 troop capacity · +5 recruitment/s per level',place:'Your land, excluding mountain summits',cap:430,rate:5},
 fort:{short:'Defends nearby tiles.',detail:'Radius 4 tiles · up to +18.5 defense per level',place:'Your land, including mountains'},
 city:{short:'Produces food, gold, and troops.',detail:'+5 food/s · +5 gold/s · +260 capacity · +3 recruitment/s per level',place:'Your land, excluding mountain summits',cap:260,rate:3}
};
const nameResource={food:'Food',wood:'Wood',stone:'Stone',gold:'Gold'};
const briefCost=c=>Object.entries(c||{}).map(([k,v])=>`<span class="cost-unit">${uiIcon(k)}${number(v)}</span>`).join(' ');
function buildingBenefit(id,p,level=1){const b=buildingInfo[id];if(!b)return '';if(b.resource)return `+${Math.round(b.perLevel*level*(1+.25*(p?.tech?.economy||0)))}/s ${({food:'food',wood:'wood',stone:'stone',gold:'gold'})[b.resource]}`;if(id==='city')return `+${Math.round(5*level*(1+.25*(p?.tech?.economy||0)))}/s food and gold · +${260*level} capacity · +${3*level} recruitment/s`;if(id==='barracks')return `+${430*level} capacity · +${5*level} recruitment/s`;if(id==='fort')return `up to +${(18.5*level).toFixed(1)} defense within radius 4`;return b.detail;}
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
 const expected=Math.max(0,Math.min(cap-p.troops,Math.round(4+land/100+p.troops*.018+c.barracks*5+c.city*3+p.tech.war*2)));
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
let activeThreats=[],announcedThreats=new Set(),lastThreatSignature="",attackFocusIndex=0;
let quickBuildOpen=false,buildPlacementChecks=0;
let zoom=1.05,camX=0,camY=0,terrainSeed=null,pressed=new Map(),pointerStart=null,gesture=null,selected=null,buildMode=null,percent=30,tooltipTimer=null,worldLayer=null,paintedRevision=-1,miniRevision=-1,renderQueued=false,panelOpen=false;let toastTimeout=null,target=null,redirectArmy=null,pauseSolo=false,moveCursor=null,lastTap=0,lastStateAt=Date.now(),pendingOrders=new Map(),seq=0,readyLocal=false,reconnectTries=0,reconnectTimer=null,connectTimer=null,tokenStore=new Map(),previousFocus=null,showTutorialOnce=true,lastRoster='',previousOwners=new Map(),previousRevs=new Map(),lastSaveTick=-1,oldArmyPositions=new Map(),movementStart=0,lastAnnounced='';
const TILE=14;const mine=()=>state?.players.find(p=>p.id===myId);const color=id=>state?.players.find(p=>p.id===id)?.color||'#e8f3f3';
function toast(msg,kind){
 const inGame=!$('game').classList.contains('hidden');
 const t=inGame?$('gameToast'):$('toast');
 const severity=kind||(/missing|rejected|error|no connection|cannot|failed|unavailable|disconnected|outdated/i.test(String(msg))?'error':/ready|completed|victor|started|researched/i.test(String(msg))?'success':'info');
 t.dataset.kind=severity;t.textContent=msg;$('gameError').textContent=severity==='error'?msg:'';
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
function hideAux(){
 if(menuPausedSolo){pauseSolo=false;menuPausedSolo=false;}
 const closingContext=!$('contextCard').classList.contains('hidden');
 for(const id of AUX_IDS)$(id)?.classList.add('hidden');
 $('auxBackdrop')?.classList.add('hidden');document.body.classList.remove('aux-open');
 // Never reopen a dismissed object card on the next network tick.
 if(closingContext)selected=null;
}
function showAux(id){
 const el=$(id);if(!el)return;
 const wasOpen=!el.classList.contains('hidden');
 if(attackPlanner)resetAttackPlanner();hideAux();if(wasOpen)return;
 if(id!=='contextCard')selected=null;
 toggleQuickBuild(false);setPreview(null);$('battleDock').classList.add('collapsed');
 if(panelOpen)closePanel();
 el.classList.remove('hidden');el.querySelector('button:not([disabled]):not(.hidden)')?.focus();$('auxBackdrop')?.classList.remove('hidden');document.body.classList.add('aux-open');
}

function name(){const val=$('nickname').value.trim().slice(0,18)||'Kingdom';try{localStorage.setItem('bk-name',val);}catch(_){ }return val;}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',v=new Uint8Array(6);crypto.getRandomValues(v);return Array.from(v,b=>chars[b%chars.length]).join('');}
function urlRoom(){return location.origin+location.pathname+'#'+code;}
function compress(arr){let chunks=[];for(let i=0;i<arr.length;i+=8192)chunks.push(String.fromCharCode(...arr.slice(i,i+8192)));return btoa(chunks.join(''));}
function expand(str){const raw=atob(str),out=new Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function rlePack(arr){const b=[];for(let i=0;i<arr.length;){const id=arr[i];let n=1;while(i+n<arr.length&&arr[i+n]===id&&n<65535)n++;b.push(id,n&255,n>>8);i+=n;}return compress(b);}
function rleUnpack(data){const a=expand(data),out=[];for(let i=0;i<a.length;i+=3){const id=a[i],n=a[i+1]+256*a[i+2];for(let j=0;j<n;j++)out.push(id);}return out;}
function pack(s,includeTerrain=true){if(!s||!s.owners?.length)return s;return {...s,tiles:includeTerrain?compress(s.tiles):null,owners:rlePack(s.owners),ownerRle:true,packed:true};}
function unpack(s){if(s?.ownerDelta){const owners=state?.owners?.slice();if(!owners?.length)throw Error('Missing state for delta');for(let i=0;i<s.owners.length;i+=2)owners[s.owners[i]]=s.owners[i+1];s.owners=owners;s.tiles=state.tiles;delete s.ownerDelta;}if(s?.packed){s.tiles=s.tiles?expand(s.tiles):(state?.tiles||[]);s.owners=s.ownerRle?rleUnpack(s.owners):expand(s.owners);delete s.ownerRle;delete s.packed;}return s;}
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
 const expanded=!!open&&activeThreats.length>1;
 $('threatList').classList.toggle('hidden',!expanded);
 $('threatExpand').setAttribute('aria-expanded',String(expanded));
}
function updateIncomingAttack(p){
 const threats=hostileAttacks(p).sort((a,b)=>threatDistance(a,p)-threatDistance(b,p)||b.strength-a.strength);
 activeThreats=threats;
 $('threatRail').classList.toggle('hidden',!threats.length);
 $('threatExpand').classList.toggle('hidden',threats.length<2);
 if(!threats.length){lastThreatSignature='';announcedThreats.clear();setThreatList(false);return;}
 const attackers=[...new Set(threats.map(a=>a.owner))].map(id=>E.person(state,id)?.name||'Enemy');
 const force=threats.reduce((sum,a)=>sum+Math.max(0,a.strength),0);
 const signature=threats.map(a=>a.id).sort().join(',');
 $('incomingTitle').textContent=threats.length===1?'UNDER ATTACK':`ATTACKS · ${threats.length} FRONTS`;
 $('incomingDetail').textContent=`${attackers.join(', ')} · ${number(force)} enemy troops`;
 $('threatCount').textContent=threats.length;
 $('incomingAttack').setAttribute('aria-label',threats.length>1?'Go to next of '+threats.length+' threats':'Go to attack location');
 patchHtml('threatItems',threats.map((a,i)=>{
  const attacker=E.person(state,a.owner),distance=threatDistance(a,p);
  return `<button type="button" data-focus-threat="${esc(a.id)}" class="threat-item"><i style="background:${attacker?.color||'#b94d40'}"></i><span><strong>${esc(attacker?.name||'Enemy')}</strong><small>${number(a.strength)} troops · ${distance<999?'≈'+distance+' tiles from capital':'at border'}</small></span><b>${i+1} ↗</b></button>`;
 }).join(''));
 if(threats.length<2)setThreatList(false);
 if(signature!==lastThreatSignature){
  const fresh=threats.filter(a=>!announcedThreats.has(a.id));
  if(fresh.length){
   const name=E.person(state,fresh[0].owner)?.name||'Enemy';
   $('incomingAnnouncement').textContent=`Warning! ${name} is attacking your territory. Tap the alert to jump to the battle.`;
  }
  attackFocusIndex=0;
  announcedThreats=new Set(threats.map(a=>a.id));
  lastThreatSignature=signature;
 }
}
$('incomingAttack').onclick=()=>{
 if(!activeThreats.length)return;
 focusThreat(activeThreats[attackFocusIndex++%activeThreats.length]);setThreatList(false);
};
$('threatExpand').onclick=()=>setThreatList($('threatList').classList.contains('hidden'));
$('threatClose').onclick=()=>setThreatList(false);
$('threatItems').onclick=e=>{
 const b=e.target.closest('[data-focus-threat]');if(!b)return;
 const a=activeThreats.find(a=>a.id===b.dataset.focusThreat);
 if(a){focusThreat(a);setThreatList(false);}
};
document.addEventListener('pointerdown',e=>{
 if(!$('threatRail').contains(e.target)&&!$('threatList').classList.contains('hidden'))setThreatList(false);
});
function refreshHudAlert(p){
 const box=$('hudAlert');if(!box||!p||state?.phase!=='playing'){box?.classList.add('hidden');return;}
 let text='',kind='',action=null;
 const net=$('networkStatus')?.textContent||'';
 if(!host&&/RECONNECT|OFFLINE|DELAY|SYNC|SERVICE|CONNECT/.test(net)){text=`Connection unstable · last update ${Math.max(0,Math.floor((Date.now()-lastStateAt)/1000))}s ago. Orders unavailable.`;kind='danger';}
 if(!text&&p.capital&&!activeThreats.length){
  const cap=p.capital;
  const attackers=state.armies.some(a=>a.owner!==myId&&!p.allies.includes(a.owner)&&Math.hypot(a.x-cap.x,a.y-cap.y)<9);
  let hostileBorder=false;
  for(let dy=-5;dy<=5&&!hostileBorder;dy++)for(let dx=-5;dx<=5;dx++){
   if(Math.abs(dx)+Math.abs(dy)>7)continue;
   const x=cap.x+dx,y=cap.y+dy;
   if(!E.inside(x,y))continue;
   const id=E.owner(state,x,y);
   if(id!==0&&id!==myId&&!p.allies.includes(id)){hostileBorder=true;break;}
  }
  if(attackers||hostileBorder){text='Capital under threat — check defenses';kind='danger';action='capital';}
 }
 if(!text&&hudNotice&&Date.now()<hudNotice.until){text=hudNotice.text;kind=hudNotice.kind;action=hudNotice.action;}
 if(!text&&p.troopIncome===0&&p.troops<p.troopCap&&p.res.food<1){text='No food — recruitment stopped';kind='notice';action='build';}
 if(!text){
  const weak=state.armies.find(a=>a.owner===myId&&a.initialStrength>0&&a.strength/a.initialStrength<.15);
  if(weak){text='An offensive is nearly depleted';kind='notice';action='armies';}
 }
 if(!text){box.classList.add('hidden');hudAlertAction=null;return;}
 box.classList.remove('hidden');box.classList.toggle('danger',kind==='danger');box.dataset.actionable=String(Boolean(action));
 $('hudAlertIcon').textContent=kind==='danger'?'!':'i';$('hudAlertText').textContent=text;
 hudAlertAction=action;box.title=action?'Tap to view this event':text;
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
 const projected=Math.max(0,Math.min(cap-p.troops,Math.round(4+p.land/100+p.troops*.018+counts.barracks*5+counts.city*3+p.tech.war*2)));
 const growth=pendingIncome?Math.min(projected,Math.floor((p.res.food||0)/.20)):Math.floor(p.troopIncome||0),full=p.troops>=cap-.5,lowFood=Number(p.res.food||0)<1;
 let reason='';if(growth===0){reason=full?'FULL':lowFood?'NO FOOD':'NO RECRUITS';}
 if(pendingIncome){$('troopGrowth').textContent='≈+'+number(growth)+'/s';$('troopCap').textContent='/ '+number(cap);}
 const cause=$('troopReason');cause.textContent=reason;cause.classList.toggle('hidden',!reason);
 $('hudTroops').title=`Reserve: ${number(p.troops)} of ${number(cap)}. ${reason||`Recruitment: +${number(growth)} per second`}`;
 const share=p.land/Math.max(1,state.landTotal)*100;
 $('landCount').textContent=share.toFixed(1)+'%';
 $('landShare').textContent='goal 100%';
 $('landProgress').style.width=Math.max(0,Math.min(100,share)).toFixed(1)+'%';
 $('landCount').title=`Land: ${number(p.land)} of ${number(state.landTotal)} cells. To 100%: ${Math.max(0,100-share).toFixed(1)} pp`;
 $('frontCount').textContent=state.armies.filter(a=>a.owner===myId&&a.strength>0).length+'/12';
 document.querySelector('.clock-stat')?.classList.remove('is-urgent');
 if(lastHudPlayer!==myId||state.tick<lastHudTick){lastHudPlayer=myId;lastHudLand=null;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";}
 const currentArmies=new Map(state.armies.filter(a=>a.owner===myId).map(a=>[a.id,a]));
 if(lastHudLand!==null&&p.land<lastHudLand){
  let lost=null;
  if(lastHudOwners){for(let i=0;i<state.owners.length;i++)if(lastHudOwners[i]&&state.owners[i]!==myId){lost={x:i%E.W,y:Math.floor(i/E.W)};break;}}
  warnHud(`Lost ${number(lastHudLand-p.land)} territory cells`, 'danger',lost,7);
 }
 if(lastHudLand!==null&&lastHudArmies.size){for(const [id,a] of lastHudArmies)if(!currentArmies.has(id)){
  const taken=Number(a.captured||0);
  warnHud(`Offensive ended${taken?' · conquered '+number(taken)+' cells':''}`, 'notice',null,3);break;
 }}
 if(lastHudLand===null||state.territoryRevision!==updateHudSignals.lastRevision){
  lastHudOwners=Uint8Array.from(state.owners,v=>v===myId?1:0);updateHudSignals.lastRevision=state.territoryRevision;
 }
 lastHudLand=p.land;lastHudTick=state.tick;lastHudArmies=new Map([...currentArmies].map(([id,a])=>[id,{id,captured:a.captured,strength:a.strength}]));
 refreshHudAlert(p);
}

function getToken(){try{let t=sessionStorage.getItem('bk-token-'+code);if(!t){t=crypto.randomUUID();sessionStorage.setItem('bk-token-'+code,t);}return t;}catch(_){return code+'-'+name();}}
function saveSolo(){if(!demo||!state||state.phase!=='playing'||mine()?.eliminated)return false;try{localStorage.setItem('bk-v14-save',JSON.stringify(state));return true;}catch(_){return false;}}
async function copyText(t){try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(t);toast('Copied');}catch(_){window.prompt('Copy the invite or code:',t);}}
function canPay(p,c){return Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);}
function deficit(p,c){return Object.entries(c||{}).filter(([k,v])=>(p.res[k]||0)<v).map(([k,v])=>({wood:'Wood',stone:'Stone',gold:'Gold',food:'Food'}[k]+': −'+(v-(p.res[k]||0)))).join(', ');}
function patchHtml(id,html){const el=$(id);if(el&&el.__last!==html){el.innerHTML=html;el.__last=html;}}
function inspectCell(x,y){if(!state||!E.inside(x,y))return;const id=E.owner(state,x,y),p=E.person(state,id),line=terrainNames[E.tile(state,x,y)]+' · '+(p?.name||'Unclaimed land')+' · '+x+','+y;$('mapStatus').textContent=line;$('mapStatusMobile').textContent=line;$('mapStatusMobile').classList.remove('hidden');}

// Tactical attack planner: outline a single contiguous enemy or neutral theatre.
const warPair=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
const fighting=id=>(state?.wars||[]).includes(warPair(myId,id));
function renderWars(){
 const wars=(state?.wars||[]).filter(k=>k.split(':').map(Number).includes(myId));
 const chip=$('warChip'),panel=$('warPanel');
 chip.classList.toggle('hidden',!wars.length);
 const received=(state?.peaceOffers||[]).some(o=>o.to===myId&&wars.includes(warPair(o.from,o.to)));
 $('warChipLabel').textContent=received?'PEACE OFFER':wars.length===1?'AT WAR':'WARS · '+wars.length;
 const html=wars.map(k=>{
  const id=k.split(':').map(Number).find(v=>v!==myId),p=E.person(state,id);
  if(!p)return '';
  const otherOffer=(state.peaceOffers||[]).some(o=>o.from===id&&o.to===myId);
  const sent=(state.peaceOffers||[]).some(o=>o.from===myId&&o.to===id);
  return '<div class="war-row"><div class="war-row-name"><span>'+esc(p.name)+'</span><small>'+ (otherOffer?'PEACE OFFER':'AT WAR')+'</small></div>'+
   '<button type="button" data-plan-peace="'+id+'" '+(sent||p.bot?'disabled':'')+'>'+
   (p.bot?'Bots do not sign peace':otherOffer?'Accept peace treaty':sent?'Proposal sent':'Propose peace')+'</button></div>';
 }).join('');
 patchHtml('warPanelList',html);
 if(!wars.length){panel.classList.add('hidden');chip.setAttribute('aria-expanded','false');}
}
function resetAttackPlanner(){
 attackPlanner=null;planCancelArmy=null;
 $('game').classList.remove('plan-drawing','plan-reviewing');
 $('planGuide').classList.add('hidden');$('planReview').classList.add('hidden');$('planCancelDialog').classList.add('hidden');
 pressed.clear();gesture=null;pointerStart=null;
 $('planAttackButton').setAttribute('aria-pressed','false');queueDraw();
}
function beginAttackPlanner(){
 if(!state||state.phase!=='playing'||mine()?.eliminated)return;
 hideAux();toggleQuickBuild(false);setPreview(null);buildMode=null;redirectArmy=null;selected=null;moveCursor=null;
 $('warPanel').classList.add('hidden');$('warChip').setAttribute('aria-expanded','false');
 pointerStart=null;gesture=null;pressed.clear();
 attackPlanner={mode:'paint',cells:new Set(),targetOwner:null,pointerId:null,lastPoint:null,brushPoint:null,zoneCells:null,brushRadius:2,touchLocked:false,strokeStart:null,strokeOrigin:null};
 $('planTroopsPercent').value=String(percent);$('planBrushSize').value='2';
 $('game').classList.add('plan-drawing');$('game').classList.remove('plan-reviewing');
 $('planGuide').classList.remove('hidden');$('planReview').classList.add('hidden');
 $('planAttackButton').setAttribute('aria-pressed','true');
 $('mapHint').classList.add('hidden');refreshPaintGuide();queueDraw();
}
// A brush paints cross-shaped five-tile stamps, keeping exactly one target owner.
function brushAt(pt){
 const plan=attackPlanner;if(plan?.mode!=='paint')return;
 const radius=plan.brushRadius,candidates=[];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(dx*dx+dy*dy>radius*radius)continue;
  const x=pt.x+dx,y=pt.y+dy;if(!E.inside(x,y)||!E.tile(state,x,y))continue;
  const owner=E.owner(state,x,y);if(owner===myId||mine()?.allies.includes(owner))continue;
  candidates.push({owner,index:y*E.W+x,d:dx*dx+dy*dy});
 }
 if(plan.targetOwner===null&&candidates.length)plan.targetOwner=candidates.reduce((best,c)=>c.d<best.d?c:best).owner;
 for(const c of candidates)if(c.owner===plan.targetOwner&&plan.cells.size<3500)plan.cells.add(c.index);
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
 const plan=attackPlanner;if(plan?.mode!=='paint')return;
 plan.brushPoint=pt;
 if(plan.lastPoint)paintLine(plan.lastPoint,pt);else brushAt(pt);
 plan.lastPoint=pt;
}
function checkPaintZone(plan){
 if(!plan?.cells?.size)return {error:'Brush over enemy or neutral land to begin.'};
 const cells=Array.from(plan.cells),owner=plan.targetOwner;
 if(cells.length<2)return {error:'Paint at least two target cells.'};
 if(cells.length>3500)return {error:'The plan is limited to 3,500 cells.'};
 if(mine()?.allies.includes(owner))return {error:'End the alliance before attacking.'};
 const selected=new Set(cells),border=[];
 for(const i of cells){
  if(!state.tiles[i]||state.owners[i]!==owner)return {error:'The territory changed. Clear and paint again.'};
  const x=i%E.W,y=(i/E.W)|0;
  if([x>0?i-1:-1,x<E.W-1?i+1:-1,y>0?i-E.W:-1,y<E.H-1?i+E.W:-1].some(j=>j>=0&&state.owners[j]===myId))border.push(i);
 }
 if(!border.length)return {error:'Paint up to your kingdom border.'};
 const seen=new Set(border),queue=border.slice();
 for(let q=0;q<queue.length;q++){
  const i=queue[q],x=i%E.W,y=(i/E.W)|0;
  for(const j of [x>0?i-1:-1,x<E.W-1?i+1:-1,y>0?i-E.W:-1,y<E.H-1?i+E.W:-1]){
   if(selected.has(j)&&!seen.has(j)){seen.add(j);queue.push(j);}
  }
 }
 if(seen.size!==cells.length)return {error:'Connect all painted cells to your border.'};
 return {cells:cells.sort((a,b)=>a-b),border};
}
function refreshPaintGuide(){
 const plan=attackPlanner;if(plan?.mode!=='paint')return;
 const check=checkPaintZone(plan),count=plan.cells.size;
 $('planPaintCount').textContent=number(count)+' cells';
 $('planPaintClear').disabled=count===0;
 $('planReviewButton').disabled=!!check.error||pressed.size>0||Math.floor((mine()?.troops||0)*percent/100)<35||(state.armies||[]).filter(a=>a.owner===myId).length>=12;
 $('planBrushValue').textContent=String(plan.brushRadius)+' tiles';
 $('planTroopsValue').textContent=percent+'% · '+number(Math.floor((mine()?.troops||0)*percent/100));
 const lowTroops=Math.floor((mine()?.troops||0)*percent/100)<35;
 $('planGuideHint').textContent=!count?'One finger paints · Two fingers move or zoom':check.error||(lowTroops?'At least 35 troops required.':'Ready to start the offensive.');
}
function clearPaintedZone(){
 const plan=attackPlanner;if(plan?.mode!=='paint')return;
 plan.cells.clear();plan.targetOwner=null;plan.lastPoint=null;plan.brushPoint=null;plan.zoneCells=null;
 refreshPaintGuide();queueDraw();
}
function reviewPaintedZone(){
 const plan=attackPlanner;if(plan?.mode!=='paint'||plan.pointerId!==null)return;
 const check=checkPaintZone(plan);
 if(check.error){refreshPaintGuide();toast(check.error,'error');return;}
 if(Math.floor((mine()?.troops||0)*percent/100)<35)return toast('At least 35 troops required.','error');
 if((state.armies||[]).filter(a=>a.owner===myId).length>=12)return toast('Maximum 12 offensives.','error');
 const start=check.border[(check.border.length/2)|0];
 if(command({type:'send',x:start%E.W,y:(start/E.W)|0,percent,zone:check.cells}))resetAttackPlanner();
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
 $('planForceLabel').textContent=percent+'%';
 $('planForceDetails').textContent=number(sent)+' committed · '+number(remaining)+' in reserve';
 const btn=$('planLaunch');btn.textContent=other&&!war?'Declare war & attack':'Start offensive';
 btn.classList.toggle('declare-war',!!other&&!war);
 btn.disabled=sent<35||!plan.zoneCells?.length||(state.armies||[]).filter(a=>a.owner===myId).length>=12;
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
function drawAttackPlanning(){
 // Called inside the world-space Canvas transform. Use region strokes rather than a filled rectangle.
 const plans=(state.attackPlans||[]).filter(p=>p.owner===myId).map(p=>({...p,waiting:!state.armies.some(a=>a.planId===p.id)}));
 const legacy=state.armies.filter(a=>a.owner===myId&&a.strength>0&&Array.isArray(a.zoneCells)&&!a.planId);
 plans.push(...legacy);
 const left=Math.max(0,Math.floor(-camX/(TILE*zoom))-2),right=Math.min(E.W-1,Math.ceil((canvas.clientWidth-camX)/(TILE*zoom))+2),
  top=Math.max(0,Math.floor(-camY/(TILE*zoom))-2),bottom=Math.min(E.H-1,Math.ceil((canvas.clientHeight-camY)/(TILE*zoom))+2);
 if(attackPlanner?.mode==='review'&&attackPlanner.zoneCells)plans.push({zoneCells:attackPlanner.zoneCells,preview:true});
 if(attackPlanner?.mode==='paint'&&attackPlanner.cells.size)plans.push({zoneCells:[...attackPlanner.cells],preview:true});
 const T=TILE;
 for(const plan of plans){
  const pending=plan.preview,waiting=plan.waiting,remaining=plan.zoneCells.filter(i=>state.owners[i]!==myId&&state.tiles[i]);
  if(!remaining.length)continue;
  const cells=new Set(remaining),visible=remaining.filter(i=>{const x=i%E.W,y=(i/E.W)|0;return x>=left&&x<=right&&y>=top&&y<=bottom;});
  if(!visible.length)continue;
  ctx.save();ctx.fillStyle=pending?'rgba(96,220,255,.31)':waiting?'rgba(96,220,255,.18)':'rgba(99,204,255,.13)';
  ctx.strokeStyle=pending?'#98edff':waiting?'#9de6fa':'#66c8ec';ctx.lineWidth=Math.max(1.2,2.1/zoom);
  if(!pending)ctx.setLineDash(waiting?[3/zoom,6/zoom]:[5/zoom,5/zoom]);
  ctx.beginPath();
  for(const i of visible){const x=i%E.W,y=(i/E.W)|0;
   ctx.fillRect(x*T,y*T,T,T);
   if(!cells.has(i-E.W)){ctx.moveTo(x*T,y*T);ctx.lineTo((x+1)*T,y*T);}
   if(!cells.has(i+E.W)){ctx.moveTo(x*T,(y+1)*T);ctx.lineTo((x+1)*T,(y+1)*T);}
   if(x===0||!cells.has(i-1)){ctx.moveTo(x*T,y*T);ctx.lineTo(x*T,(y+1)*T);}
   if(x===E.W-1||!cells.has(i+1)){ctx.moveTo((x+1)*T,y*T);ctx.lineTo((x+1)*T,(y+1)*T);}
  }
  ctx.stroke();ctx.restore();
 }
 const brush=attackPlanner?.mode==='paint'&&attackPlanner.brushPoint;
 if(brush&&E.inside(brush.x,brush.y)){
  ctx.save();ctx.beginPath();ctx.arc((brush.x+.5)*T,(brush.y+.5)*T,T*(attackPlanner.brushRadius+.5),0,Math.PI*2);
  ctx.fillStyle='rgba(103,223,255,.12)';ctx.strokeStyle='#b1f1ff';ctx.lineWidth=Math.max(1,1.6/zoom);
  ctx.fill();ctx.stroke();ctx.restore();
 }
}

function setPreview(t){
 target=t;const box=$('targetPreview');box.classList.toggle('hidden',!t);$('game').classList.toggle('is-targeting',!!t);
 if(!t){queueDraw();return;}
 const owner=E.owner(state,t.x,t.y),enemy=E.person(state,owner),p=mine(),sent=Math.floor(p.troops*percent/100);
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
 const building=E.buildingAt(state,t.x,t.y);
 $('targetTitle').textContent=t.type==='redirect'?'Redirect offensive':allied?'Ally: '+enemy.name:enemy?'Diplomacy · '+enemy.name:'No foreign kingdom';
 $('targetDetail').textContent=t.type==='redirect'?`${number(sent)} troops · reserve ${number(p.troops-sent)} · ${terrainNames[E.tile(state,t.x,t.y)]}`:`${terrainNames[E.tile(state,t.x,t.y)]}${building?' · '+(E.KINDS[building.kind]?.name||'Capital'):''} · Alliances and peace`;
 const defense=enemy?Math.round(E.tileDefense(state,owner,t.x,t.y)):0;const averageDefense=enemy&&front.cells.length?Math.round(front.cells.reduce((sum,i)=>sum+E.tileDefense(state,owner,i%E.W,Math.floor(i/E.W)),0)/front.cells.length):0;
 $('targetForecast').textContent=allied?'Allied territory cannot be attacked. End the alliance first.':
   t.type==='redirect'?'Confirm to redirect your army.':
   sea?'Sea is impassable. Choose land.':
   owner?(war?'War is active. Paint a target area to start a new advance.':'Paint a connected attack area. The first confirmed attack declares war.'):
   'Brush over neutral land connected to your border, then review and confirm.';
 $('confirmTarget').textContent=t.type==='redirect'?'Change target':'Paint attack zone';
 $('confirmTarget').disabled=allied;
 if(t.type==='redirect'&&!allied&&p.troops-sent<Math.max(75,Math.min(300,p.troopCap*.12)))$('targetForecast').textContent+=' Warning: your reserve will be low after this order.';
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
  const details=buildingInfo[item.kind],cost=E.costUpgrade(item),maxed=item.level>=4;
  const effect=details?buildingBenefit(item.kind,me,item.level):'Capital defense improves at each level';
  const next=details?buildingBenefit(item.kind,me,item.level+1):'Capital defense will increase';
  html=`<div class="context-heading"><strong>${esc(E.KINDS[item.kind]?.name||'Capital')} · lvl. ${item.level}</strong><small>${esc(other?.name||'')}</small></div>
   <div class="context-effect"><small>Current</small><span>${esc(effect)}</span></div>
   ${maxed?'':`<div class="context-effect context-effect-next"><small>After upgrade</small><span>${esc(next)}</span></div>`}
   ${own&&!maxed?`<div class="context-upgrade-price"><small>Upgrade cost</small><div>${briefCost(cost)}</div></div><button data-context-upgrade="${esc(item.id)}" ${!canPay(me,cost)?'disabled':''}>Upgrade</button>${!canPay(me,cost)?`<small class="context-shortage">Missing: ${deficit(me,cost)}</small>`:''}`:own?'<small>Maximum level</small>':''}`;

 }else html=`<strong>Army · ${esc(other?.name||'')}</strong><span>${number(item.strength)} troops · ${item.tx},${item.ty}</span>${own?`${!Array.isArray(item.zoneCells)?`<button data-context-redirect="${esc(item.id)}">Change target</button>`:''}<button data-context-return="${esc(item.id)}">Retreat</button>`:''}`;
 if(content.__last!==html){content.innerHTML=html;content.__last=html;}if(box.classList.contains('hidden'))showAux('contextCard');
}
function createRoom(){if(!getPeer())return;setBusy(true);code=randomCode();host=true;demo=false;readyLocal=true;peer=new Peer('bk-'+code);const sessionPeer=peer;setNetwork('CONNECTING');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Could not create room. Try again.');try{peer.destroy();}catch(_){}}},12000);
 peer.on('open',()=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);state=E.lobby(Date.now());myId=E.addPlayer(state,name());state.players[0].ready=true;state.settings={bots:Number($('botCount').value)};setNetwork('HOST');try{history.replaceState(null,'','#'+code);}catch(_){}phaseShown='';render();});
 peer.on('connection',c=>{if(peer===sessionPeer)joinConnection(c);});peer.on('error',e=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);error('Room: '+(e.message||e.type||'error'));});
 peer.on('disconnected',()=>{if(peer===sessionPeer)setNetwork('SERVICE UNAVAILABLE');});
}
function joinRoom(){if(!getPeer())return;code=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);if(!/^[A-Z0-9]{6}$/.test(code))return error('Enter a six-character room code.');$('lobbyError').textContent='';setBusy(true);host=false;demo=false;peer=new Peer();const sessionPeer=peer;setNetwork('CONNECTING');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Room not responding. Check the code.');try{peer.destroy();}catch(_){}}},14000);
 peer.on('open',()=>{if(peer===sessionPeer)connectUpstream();});peer.on('error',e=>{if(peer!==sessionPeer)return;clearTimeout(connectTimer);setBusy(false);error('Connection: '+(e.message||e.type||'error'));});
}
function connectUpstream(){if(!peer||peer.destroyed)return;upstream=peer.connect('bk-'+code,{reliable:true});const activeConnection=upstream;
 upstream.on('open',()=>{if(upstream!==activeConnection)return;upstream.send({t:'join',name:name(),token:getToken()});});
 upstream.on('data',m=>{if(upstream!==activeConnection)return;if(!m||typeof m!=='object')return;if(m.t==='room-closed'){goHome();error('Host closed the room. Create or join another.');return;}if(m.t==='welcome'){clearTimeout(connectTimer);setBusy(false);reconnectTries=0;myId=m.id;state=unpack(m.state);lastStateAt=Date.now();phaseShown=state.phase==='playing'?'':phaseShown;setNetwork('ONLINE');render();}else if(m.t==='state'){if(m.state?.ownerDelta&&m.state.ownerBaseRev!==state?.territoryRevision){upstream.send({t:'resync'});setNetwork('SYNCING');return;}const before=state?.armies||[];oldArmyPositions=new Map(before.map(a=>[a.id,{x:a.x,y:a.y}]));movementStart=performance.now();state=unpack(m.state);lastStateAt=Date.now();setNetwork('ONLINE');render();}else if(m.t==='ack'){pendingOrders.delete(m.id);toast(m.ok?'Order completed':m.error||'Order rejected');if(m.ok&&m.action==='build'){toast('Built · you can place another');refreshQuickBuild();}}else if(m.t==='error'){clearTimeout(connectTimer);setBusy(false);if(!state)error(m.message);else toast(m.message);}});
 upstream.on('close',()=>{if(upstream!==activeConnection)return;setNetwork('RECONNECTING');retryUpstream();});upstream.on('error',()=>{if(upstream!==activeConnection)return;setNetwork('OFFLINE');});
}
function retryUpstream(){if(host||demo||!peer||peer.destroyed)return;clearTimeout(reconnectTimer);if(++reconnectTries>8){setNetwork('OFFLINE');toast('Host not responding. The host must keep their tab open.');return;}reconnectTimer=setTimeout(connectUpstream,Math.min(12000,1000*reconnectTries));}
function joinConnection(conn){const sessionPeer=peer;conn.on('data',m=>{if(peer!==sessionPeer)return;if(!m||typeof m!=='object')return;
 if(m.t==='join'){
  if(connections.has(conn))return;
  let id=tokenStore.get(m.token);const old=state.players.find(p=>p.id===id);
  if(!old||old.bot){if(state.phase!=='lobby'){conn.send({t:'error',message:'Match already started. Rejoin from your previous device.'});return;}id=E.addPlayer(state,m.name);if(!id){conn.send({t:'error',message:'Room is full.'});return;}}
  if(m.token)tokenStore.set(m.token,id);
  for(const [c,v] of connections)if(v===id&&c!==conn){connections.delete(c);previousOwners.delete(c);previousRevs.delete(c);try{c.close();}catch(_){ }}
  state.players.find(p=>p.id===id).connected=true;state.players.find(p=>p.id===id).ready=true;connections.set(conn,id);conn.send({t:'welcome',id,state:pack(state)});previousOwners.delete(conn);previousRevs.delete(conn);broadcast(false);
 }else if(m.t==='resync'){conn.send({t:'state',state:pack(state,true)});previousOwners.set(conn,state.owners.slice());previousRevs.set(conn,state.territoryRevision);}else if(m.t==='spawn'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){p.spawnPreference=['northwest','northeast','southwest','southeast','auto'].includes(m.choice)?m.choice:'auto';broadcast();}}else if(m.t==='ready'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){p.ready=!!m.value;broadcast();}}
 else if(m.t==='settings'){/* only the room host may edit settings */}
 else if(m.t==='action'){
  const id=connections.get(conn);if(!id)return;const now=Date.now();if(now-(lastSendTime.get(conn)||0)<75)return;
  lastSendTime.set(conn,now);const result=E.action(state,id,m.action);conn.send({t:'ack',id:m.id,ok:result.ok,error:result.error,action:m.action?.type});if(result.ok)broadcast();
 }
 });conn.on('close',()=>{if(peer!==sessionPeer||!state)return;const id=connections.get(conn);connections.delete(conn);previousOwners.delete(conn);previousRevs.delete(conn);lastSendTime.delete(conn);if(id){const p=E.person(state,id);if(p){if(state.phase==='lobby'){state.players=state.players.filter(v=>v.id!==id);for(const [token,pid] of tokenStore)if(pid===id)tokenStore.delete(token);}else{p.connected=false;p.ready=false;}}broadcast();}});}
function broadcast(includeTerrain=false){if(!state)return;const packed=pack(state,includeTerrain);for(const c of connections.keys())if(c.open){try{let delta=null,old=previousOwners.get(c);if(!includeTerrain&&old&&old.length===state.owners.length&&state.phase==='playing'){const changes=[];for(let i=0;i<old.length;i++)if(old[i]!==state.owners[i])changes.push(i,state.owners[i]);if(changes.length<state.owners.length*.32)delta=changes;}const out=delta?{...packed,owners:delta,ownerDelta:true,ownerBaseRev:previousRevs.get(c),packed:false}:packed;c.send({t:'state',state:out});previousOwners.set(c,state.owners.slice());previousRevs.set(c,state.territoryRevision);}catch(_){}}render();}
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
function startGame(){if(!host)return;const waiting=state.players.filter(p=>!p.bot&&p.connected!==false&&!p.ready);if(waiting.length)return toast('Waiting for: '+waiting.map(p=>p.name).join(', '));state.settings={bots:Number($('botCount').value)};const res=E.start(state,state.settings.bots);if(!res.ok)return toast(res.error);broadcast(true);showTutorial();}
function command(a){if(!state||state.phase!=='playing')return false;
 if(host){const r=E.action(state,myId,a);if(!r.ok){toast(r.error);return false;}broadcast();if(a.type==='build'){toast('Built · you can place another');refreshQuickBuild();}else if(a.type==='send'){toast('Offensive started');}return true;}
 if(upstream?.open){if(Date.now()-lastStateAt>4500){setNetwork('OFFLINE');toast('Data is outdated. Wait for reconnection before issuing an order.');return false;}const id=++seq;pendingOrders.set(id,Date.now());upstream.send({t:'action',id,action:a});return true;}toast('Room connection lost.');return false;}
function showTutorial(){if(!showTutorialOnce)return;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}showTutorialOnce=false;}

function render(){if(!state)return;
 if(state.phase==='lobby'){
  $('victory').classList.add('hidden');show('waiting');$('showCode').textContent=code;$('roomHeadingLabel').textContent=host?'ROOM READY':'IN ROOM';$('roomMembersCount').textContent=state.players.filter(p=>!p.bot).length+' players';
  patchHtml('waitingPlayers',state.players.map(p=>`<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${esc(p.name)}</strong><span class="muted">${p.id===myId?'You':p.id===1?'Host':''} · ${p.connected===false?'Offline':p.ready?'In room':'Connecting'}</span></div>`).join(''));
  $('startButton').classList.toggle('hidden',!host);$('readyButton').classList.add('hidden');$('readyButton').setAttribute('aria-pressed',String(readyLocal));$('readyButton').textContent=readyLocal?'Ready ✓':'I am ready';$('botCount').disabled=!host;$('spawnChoice').disabled=false;
  $('startButton').disabled=!state.players.filter(p=>!p.bot).every(p=>p.ready||p.connected===false);$('botCount').value=state.settings?.bots??0;
  $('waitingHint').textContent=host?'You are the host. Leaving closes the room.':'Waiting for host to start. You are ready.'; $('roomSettingsSummary').textContent=(state.settings?.bots??0)+' bots';
  phaseShown='lobby';return;
 }
 if(phaseShown!=='playing'&&phaseShown!=='ended'){
  lastHudLand=null;lastHudTick=-1;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";
  show('game');phaseShown='playing';zoom=window.innerWidth<600?2.2:1.8;$('zoomText').textContent=Math.round(zoom*100)+'%';setMinimapExpanded(window.innerWidth>=850);resize();centerOnCapital();
 }else if(phaseShown==='ended'&&state.phase==='playing'&&!mine()?.eliminated){phaseShown='playing';}
 updateUI();repaintWorld();queueDraw();
 if((state.phase==='ended'||mine()?.eliminated&&!defeatDismissed)&&phaseShown!=='ended'){
  phaseShown='ended';const w=state.players.find(p=>p.id===state.winner),me=mine();
  const outcome=me?.eliminated?'loss':!w?'draw':w.id===myId?'win':'loss';
  const reason=state.phase==='ended'?'The winner controls all land (100%).':'You lost all your land. You can spectate or leave.';
  if(demo){try{localStorage.removeItem('bk-v14-save');}catch(_){}}
  $('spectateMatch').classList.toggle('hidden',state.phase==='ended');
  const duration=Math.floor(state.tick/60)+'m '+String(state.tick%60).padStart(2,'0')+'s';
  $('victoryName').textContent=outcome==='win'?'Victory!':outcome==='loss'?'Defeat':'Draw';
  $('victoryEyebrow').textContent=outcome==='win'?'YOUR KINGDOM':outcome==='loss'?'MATCH ENDED':'MATCH ENDED';
  $('resultEmblem').textContent=outcome==='win'?'★':outcome==='loss'?'⚔':'◈';
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
 renderWars();if(attackPlanner?.mode==='review')refreshPlanReview();else if(attackPlanner?.mode==='paint'&&attackPlanner.pointerId===null)refreshPaintGuide();
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
  item.setAttribute('title',`${nameResource[r]}: ${number(amount)}. ${r==='food'?'Estimated net growth after recruitment':'Production'}: ${rate>=0?'+':'−'}${number(Math.abs(rate))} per second`);
 }

 updateIncomingAttack(p);
 $('troopCount').textContent=hudNumber(p.troops);$('troopCount').title=number(p.troops);$('troopCap').textContent='/ '+hudNumber(p.troopCap);$('troopCap').title=number(p.troopCap);setRate($('troopGrowth'),p.troopIncome||0);updateHudSignals(p);$('myKingdom').textContent=p.name+(p.eliminated?' · ELIMINATED':'');$('myKingdom').title=p.name;$('myKingdom').style.color=p.color;
 const sent=Math.floor(p.troops*percent/100);
 const myPlans=(state.attackPlans||[]).filter(v=>v.owner===myId),unplanned=state.armies.filter(a=>a.owner===myId&&!myPlans.some(plan=>plan.id===a.planId));
 const frontNum=myPlans.length+unplanned.length;
 $('sendingTroops').textContent=number(sent);$('remainingTroops').textContent=number(p.troops-sent);$('activeArmies').textContent=frontNum+'/12';$('dockSummary').textContent=percent+'%';if(target)setPreview(target);$('frontCountBadge').textContent=String(frontNum);$('frontCountBadge').classList.toggle('hidden',frontNum===0);$('armiesToggle').setAttribute('aria-label',`My offensives: ${frontNum}`);$('armiesToggle').classList.toggle('has-fronts',frontNum>0);renderArmies();
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
 const p=mine(),container=$('quickBuildChoices');if(!container||!p||!state)return;
 const html=Object.entries(E.KINDS).map(([id,item])=>{
  const costs=Object.entries(item.cost).map(([r,n])=>`<span class="cost-unit ${(p.res[r]||0)<n?'cost-missing':''}" title="${nameResource[r]}">${uiIcon(r)}${n}</span>`).join('');
  const affordable=Object.entries(item.cost).every(([r,n])=>(p.res[r]||0)>=n);
  return `<button type="button" class="quick-build-item ${buildMode===id?'chosen':''} ${!affordable?'unaffordable':''}" data-fast-build="${id}" aria-pressed="${buildMode===id}" title="${esc(item.name)} — ${esc(buildingInfo[id]?.short||'')}">${buildingArt(id)}<span class="building-name">${esc(item.name)}</span><small class="building-cost">${costs}</small>${$('quickBuild').classList.contains('with-descriptions')?`<small class="quick-description">${esc(buildingInfo[id]?.short||'')} ${esc(buildingBenefit(id,p,1))}</small>`:''}</button>`;
 }).join('');
 if(container.dataset.html!==html){const scroll=container.scrollLeft;container.innerHTML=html;container.dataset.html=html;container.scrollLeft=scroll;}
 const description=buildMode?`${E.KINDS[buildMode]?.name}: green — valid, red — invalid. ${buildMode==='fort'?'Yellow diamond — defense radius.':''}`:'Choose a building, then a tile on your land.';
 $('quickBuildHelp').textContent=description;
 $('placingBuild').classList.toggle('hidden',!buildMode||quickBuildOpen);
 if(buildMode){$('placingBuildText').textContent=E.KINDS[buildMode].name+' · choose a tile';$('placingBuildIcon').src='assets/shapes/'+buildMode+'.svg';}
}
function toggleQuickBuild(force){
 quickBuildOpen=typeof force==='boolean'?force:!quickBuildOpen;
 $('quickBuild').classList.toggle('hidden',!quickBuildOpen);
 $('mapView').classList.toggle('build-palette-open',quickBuildOpen);
 if(quickBuildOpen){closePanelIfOpen();setPreview(null);}
 refreshQuickBuild();queueDraw();
}
function closePanelIfOpen(){if(panelOpen)closePanel();}
function setBuildingMode(kind){
 if(kind&&attackPlanner)resetAttackPlanner();
 buildMode=kind||null;selected=null;setPreview(null);moveCursor=null;
 $('cancelMode').classList.toggle('hidden',!buildMode);
 $('modeLabel').textContent=buildMode?'Build: '+E.KINDS[buildMode].name:'Offensive';
 $('actionHint').textContent=buildMode?'Green tile — allowed, red tile — blocked.':'Tap a target or drag from your land.';
 if(buildMode)toggleQuickBuild(false);
 refreshQuickBuild();updateUI();queueDraw();
}
$('quickBuildChoices').addEventListener('click',e=>{const b=e.target.closest('[data-fast-build]');if(b)setBuildingMode(b.dataset.fastBuild);});
$('quickBuildClose').onclick=()=>toggleQuickBuild(false);
$('quickBuildInfo').onclick=()=>{const expanded=$('quickBuild').classList.toggle('with-descriptions');$('quickBuildInfo').setAttribute('aria-expanded',String(expanded));refreshQuickBuild();};
$('changeBuild').onclick=()=>toggleQuickBuild(true);
$('stopBuild').onclick=cancelMode;

$('techPanel').addEventListener('click',e=>{const b=e.target.closest('[data-research]');if(b)command({type:'research',key:b.dataset.research});});
$('contextCard').addEventListener('click',e=>{const u=e.target.closest('[data-context-upgrade]'),r=e.target.closest('[data-context-return]'),d=e.target.closest('[data-context-redirect]');if(u)command({type:'upgrade',id:u.dataset.contextUpgrade});if(r){command({type:'return',id:r.dataset.contextReturn});contextual(null);}if(d){redirectArmy=d.dataset.contextRedirect;toast('Now choose a new target on the map.');contextual(null);}});
$('closeContext').onclick=()=>{selected=null;contextual(null);hideAux()};
function openPanel(){hideAux();toggleQuickBuild(false);setPreview(null);previousFocus=document.activeElement;panelOpen=true;$('sidebar').classList.add('open');$('panelBackdrop').classList.remove('hidden');$('sidebar').setAttribute('aria-modal',String(window.innerWidth<851));$('closePanel').focus();}
function closePanel(){panelOpen=false;$('sidebar').classList.remove('open');$('panelBackdrop').classList.add('hidden');$('sidebar').setAttribute('aria-modal','false');previousFocus?.focus?.();}
$('menuToggle').onclick=openSession;$('developButton').onclick=()=>toggleQuickBuild();$('closePanel').onclick=closePanel;$('panelBackdrop').onclick=closePanel;$('auxBackdrop').onclick=hideAux;
$('attackPercent').oninput=e=>{percent=Number(e.target.value);$('percentLabel').textContent=percent+'%';document.querySelectorAll('[data-percent]').forEach(t=>{const on=Number(t.dataset.percent)===percent;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});if(state)updateUI();};
document.querySelectorAll('[data-target-percent]').forEach(b=>b.onclick=()=>{$('attackPercent').value=b.dataset.targetPercent;$('attackPercent').oninput({target:$('attackPercent')});});
for(const b of document.querySelectorAll('[data-percent]')){b.setAttribute('aria-pressed',String(Number(b.dataset.percent)===percent));b.onclick=()=>{$('attackPercent').value=b.dataset.percent;$('attackPercent').oninput({target:$('attackPercent')});};}
$('cancelMode').onclick=cancelMode;function cancelMode(){setBuildingMode(null);}
$('cancelTarget').onclick=()=>{setPreview(null);redirectArmy=null;lastTap=0;};$('confirmTarget').onclick=()=>{if(!target)return;if(target.type!=='redirect'){beginAttackPlanner();return;}const t=target;const ok=command({type:'redirect',id:t.id,x:t.x,y:t.y});if(ok){setPreview(null);redirectArmy=null;}};

$('planAttackButton').onclick=()=>attackPlanner?resetAttackPlanner():beginAttackPlanner();
$('planGuideExit').onclick=resetAttackPlanner;
$('planReviewClose').onclick=editPaintedZone;
$('planDiscard').onclick=editPaintedZone;
$('planPaintClear').onclick=clearPaintedZone;
$('planReviewButton').onclick=reviewPaintedZone;
$('planBrushSize').oninput=e=>{if(!attackPlanner)return;attackPlanner.brushRadius=Number(e.target.value)||2;refreshPaintGuide();queueDraw();};
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
 if(attackPlanner)resetAttackPlanner();
 const panel=$('warPanel'),opening=panel.classList.contains('hidden');
 panel.classList.toggle('hidden',!opening);$('warChip').setAttribute('aria-expanded',String(opening));
};
$('warPanelClose').onclick=()=>{$('warPanel').classList.add('hidden');$('warChip').setAttribute('aria-expanded','false');};
$('warPanelList').onclick=e=>{
 const btn=e.target.closest('[data-plan-peace]');if(!btn||btn.disabled)return;
 const other=Number(btn.dataset.planPeace),accepted=(state.peaceOffers||[]).some(o=>o.from===other&&o.to===myId);
 if(command({type:'peace',target:other})){toast(accepted?'Peace treaty accepted':'Peace proposal sent');if(accepted){$('warPanel').classList.add('hidden');$('warChip').setAttribute('aria-expanded','false');}}
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
 if(!state||!myId)return;
 const plans=(state.attackPlans||[]).filter(p=>p.owner===myId);
 const plannedIDs=new Set(plans.map(p=>p.id));
 const rows=plans.map(p=>{
  const active=state.armies.find(a=>a.planId===p.id&&a.strength>0);
  const left=p.zoneCells.filter(i=>state.tiles[i]&&state.owners[i]!==myId).length;
  const label=esc(E.person(state,p.targetOwner)?.name||'Neutral land');
  const status=active?'Wave '+number(p.waves)+' advancing · '+number(active.strength)+' troops':'Waiting for next wave';
  return `<div class="army-line"><div><strong>${label} <small>· ${number(left)} cells left</small></strong>
   <small>${status}</small><small class="army-stats">Plan persists until captured or cancelled · ${p.percent}% per wave</small></div>
   <button data-focus-plan="${esc(p.id)}" aria-label="Locate planned area">Locate</button>
   <button data-cancel-plan="${esc(p.id)}" aria-label="Cancel offensive plan">Cancel</button></div>`;
 });
 for(const a of state.armies.filter(a=>a.owner===myId&&!plannedIDs.has(a.planId))){
  const initial=a.initialStrength||a.strength,spent=Math.max(0,initial-a.strength),pct=Math.floor(spent/Math.max(1,initial)*100);
  rows.push(`<div class="army-line"><div><strong>${number(a.strength)} troops <small>of ${number(initial)}</small></strong>
  <small>${esc(E.person(state,a.targetOwner)?.name||'Neutral land')} · ${a.stuck>0?'Front meets resistance':'Advancing'}</small>
  <small class="army-stats${pct>=80?' army-critical':''}">Captured ${number(a.captured||0)} cells · Losses ${number(spent)}</small></div>
  <button data-focus-army="${esc(a.id)}" aria-label="Locate army">Locate</button>
  <button data-recall-army="${esc(a.id)}" aria-label="Recall army">Recall</button></div>`);
 }
 patchHtml('armiesList',rows.length?rows.join(''):'<div class="empty-armies"><strong>No offensives yet</strong><p>Tap Attack and paint a zone to begin.</p></div>');
}
$('armiesToggle').onclick=()=>{showAux('armiesPanel');renderArmies();};
$('closeArmies').onclick=hideAux;
$('armiesList').onclick=e=>{
 const cancel=e.target.closest('[data-cancel-plan]'),focus=e.target.closest('[data-focus-plan]');
 const recall=e.target.closest('[data-recall-army]'),armyFocus=e.target.closest('[data-focus-army]');
 if(cancel){const plan=(state.attackPlans||[]).find(p=>p.id===cancel.dataset.cancelPlan);if(plan){hideAux();openCancelPlan(plan);}return;}
 if(focus){
  const plan=(state.attackPlans||[]).find(p=>p.id===focus.dataset.focusPlan);
  if(plan){const active=state.armies.find(a=>a.planId===plan.id),i=plan.zoneCells.find(i=>state.owners[i]!==myId)??plan.zoneCells[0],x=active?.x??i%E.W,y=active?.y??(i/E.W)|0;camX=canvas.clientWidth/2-(x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(y+.5)*TILE*zoom;clampCamera();hideAux();queueDraw();}
  return;
 }
 if(recall){const a=state.armies.find(a=>a.id===recall.dataset.recallArmy);if(a){hideAux();openCancelPlan(a);}return;}
 if(armyFocus){const a=state.armies.find(a=>a.id===armyFocus.dataset.focusArmy);if(a){camX=canvas.clientWidth/2-(a.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(a.y+.5)*TILE*zoom;clampCamera();hideAux();queueDraw();}}
};
$('helpButton').onclick=()=>{hideAux();$('tutorial').classList.remove('hidden');$('closeTutorial').focus();};$('closeTutorial').onclick=()=>{$('tutorial').classList.add('hidden');showTutorialOnce=false;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}$('mapCanvas').focus();};
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
function nearestObject(px,py,kind){const arr=kind==='army'?state.armies:state.buildings,worldX=(px-camX)/(TILE*zoom),worldY=(py-camY)/(TILE*zoom);let nearest=null,best=Infinity;for(const v of arr){const d=Math.hypot(v.x+.5-worldX,v.y+.5-worldY)*TILE*zoom;if(d<best&&d<(kind==='army'?23:25)){best=d;nearest=v;}}return nearest;}
function selectMap(clientX,clientY){
 if(state?.phase!=='playing'||mine()?.eliminated)return;
 const pt=pixelAt(clientX,clientY),p=gridAt(clientX,clientY);
 if(!E.inside(p.x,p.y))return;
 if(attackPlanner)return;
 const regionIndex=p.y*E.W+p.x;
 const savedPlan=(state.attackPlans||[]).find(p=>p.owner===myId&&state.owners[regionIndex]!==myId&&p.zoneCells.includes(regionIndex));
 if(savedPlan){openCancelPlan(savedPlan);return;}
 const activePlan=state.armies.find(a=>a.owner===myId&&a.strength>0&&Array.isArray(a.zoneCells)&&!a.planId&&a.zoneCells.includes(regionIndex));
 if(activePlan){openCancelPlan(activePlan);return;}
 inspectCell(p.x,p.y);$('mapHint').classList.add('hidden');
 if(buildMode){
  moveCursor=p;if(E.owner(state,p.x,p.y)!==myId)return toast('Must be your territory','error');
  const fail=E.canBuild(state,myId,buildMode,p.x,p.y);if(fail)return toast(fail,'error');
  command({type:'build',kind:buildMode,x:p.x,y:p.y});queueDraw();return;
 }
 if(redirectArmy){setPreview({type:'redirect',id:redirectArmy,x:p.x,y:p.y,valid:true});return;}
 // In a conquest game, tap ownership wins over enlarged decorative hitboxes.
 // Enemy buildings and friendly icons near an enemy border must not block attacks.
 const clickedOwner=E.owner(state,p.x,p.y);
 if(clickedOwner!==myId){
  if(!E.tile(state,p.x,p.y))return toast('You cannot conquer the sea. Choose land.');
  selected=null;contextual(null);
  const opponent=E.person(state,clickedOwner);
  if(opponent&&!opponent.bot)setPreview({type:'send',x:p.x,y:p.y,valid:true});else setPreview(null);
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
 if(!cancelled&&pressed.size===1&&pressed.has(e.pointerId)&&!plan.touchLocked&&plan.pointerId===e.pointerId){
  if(!plan.lastPoint&&plan.strokeStart)paintAtPointer(plan.strokeStart);
  else if(plan.lastPoint)paintAtPointer(gridAt(e.clientX,e.clientY));
 }
 pressed.delete(e.pointerId);
 plan.pointerId=null;plan.lastPoint=null;plan.strokeStart=null;plan.strokeOrigin=null;plan.brushPoint=null;
 if(pressed.size>=2){plan.touchLocked=true;beginPaintNavigation();}
 else if(pressed.size===1){plan.touchLocked=true;gesture=null;}
 else{plan.touchLocked=false;gesture=null;}
 refreshPaintGuide();queueDraw();
}
function onPointerDown(e){
 if(!state)return;
 if(attackPlanner){
  const plan=attackPlanner;if(plan.mode!=='paint')return;
  canvas.setPointerCapture(e.pointerId);
  pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pressed.size>=2){
   plan.touchLocked=true;plan.pointerId=null;plan.lastPoint=null;
   plan.strokeStart=null;plan.strokeOrigin=null;plan.brushPoint=null;
   if(pressed.size===2)beginPaintNavigation();
  }else if(!plan.touchLocked){
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
 if(attackPlanner){
  const plan=attackPlanner;if(!pressed.has(e.pointerId))return;
  pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pressed.size>=2){updatePaintNavigation();return;}
  if(plan.touchLocked||plan.pointerId!==e.pointerId)return;
  if(!plan.lastPoint&&plan.strokeOrigin&&Math.hypot(e.clientX-plan.strokeOrigin.x,e.clientY-plan.strokeOrigin.y)<6)return;
  if(!plan.lastPoint&&plan.strokeStart)paintAtPointer(plan.strokeStart);
  paintAtPointer(gridAt(e.clientX,e.clientY));queueDraw();return;
 }
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
 if(attackPlanner){finishPaintPointer(e);return;}
 const was=pointerStart,touch=pressed.size;
 pressed.delete(e.pointerId);
 if(touch===1){
  pointerStart=null;
  if(was&&!was.moved){const now=Date.now(),g=gridAt(e.clientX,e.clientY),friendly=E.inside(g.x,g.y)&&E.owner(state,g.x,g.y)===myId;if(friendly&&!target&&!buildMode&&now-lastTap<280){const p=pixelAt(e.clientX,e.clientY);zoomAt(1.45,p.x,p.y);lastTap=0;}else{selectMap(e.clientX,e.clientY);lastTap=friendly?now:0;}}
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
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pixelAt(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.13:.885,p.x,p.y);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('zoomIn').onclick=()=>zoomAt(1.24,canvas.clientWidth/2,canvas.clientHeight/2);$('zoomOut').onclick=()=>zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);function fitWorld(){hideAux();zoom=Math.min((canvas.clientWidth-16)/(E.W*TILE),(canvas.clientHeight-16)/(E.H*TILE));camX=(canvas.clientWidth-E.W*TILE*zoom)/2;camY=(canvas.clientHeight-E.H*TILE*zoom)/2;$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*E.W,y=(e.clientY-r.top)/r.height*E.H;camX=canvas.clientWidth/2-x*TILE*zoom;camY=canvas.clientHeight/2-y*TILE*zoom;clampCamera();queueDraw();});mini.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fitWorld();}});
// Low-resolution territory bitmap: one pixel per world tile. The GPU enlarges it.
// It is updated only when a territory changes, NOT once per animation frame.
const TERRAIN_RGB=[[8,10,14],[36,40,48],[25,34,39],[53,55,64],[47,53,54],[65,66,78],[79,81,91]];
let minimapCached=null,pixelLayer=null;
function repaintWorld(){
 if(!state?.owners?.length||!state?.tiles?.length)return;
 const revision=state.territoryRevision??state.tick;
 if(worldLayer&&paintedRevision===revision&&terrainSeed===state.seed)return;
 if(!worldLayer){worldLayer=document.createElement('canvas');worldLayer.width=E.W*6;worldLayer.height=E.H*6;}
 if(!pixelLayer){pixelLayer=document.createElement('canvas');pixelLayer.width=E.W;pixelLayer.height=E.H;}
 const c=pixelLayer.getContext('2d',{alpha:false});const img=c.createImageData(E.W,E.H);
 const colors=Object.fromEntries(state.players.map(p=>{const x=parseInt(p.color.slice(1),16);return[p.id,[(x>>>16)&255,(x>>>8)&255,x&255]];}));
 const owners=state.owners,tiles=state.tiles,d=img.data;
 for(let i=0;i<owners.length;i++){
  const terr=TERRAIN_RGB[tiles[i]]||TERRAIN_RGB[1],id=owners[i],col=id?colors[id]:null;
  const p=i*4;
  const k=col ? 0.48 : 0;
  let h=Math.imul(i% E.W+state.seed*3,374761393)^Math.imul((i/E.W)|0,668265263);h=Math.imul(h^(h>>>13),1274126177);const noise=((h>>>24)&15)-7;
  const shade=tiles[i]===0?noise*.08:noise*.20;
  d[p]=Math.max(0,Math.min(255,Math.round(terr[0]*(1-k)+(col?.[0]||0)*k+shade)));
  d[p+1]=Math.max(0,Math.min(255,Math.round(terr[1]*(1-k)+(col?.[1]||0)*k+shade)));
  d[p+2]=Math.max(0,Math.min(255,Math.round(terr[2]*(1-k)+(col?.[2]||0)*k+shade)));
  d[p+3]=255;
 }
 c.putImageData(img,0,0);const wc=worldLayer.getContext('2d',{alpha:false});wc.imageSmoothingEnabled=false;wc.drawImage(pixelLayer,0,0,worldLayer.width,worldLayer.height);
 // Painted terrain marks: cached in world bitmap, not recreated every frame.
 for(let y=1;y<E.H-1;y++)for(let x=1;x<E.W-1;x++){
  const i=y*E.W+x,t=tiles[i];if(owners[i]||!t||((x*41+y*73+state.seed*13)%17))continue;
  const px=x*6+3,py=y*6+3;
  if(t===2){wc.fillStyle='#a5b5bd55';wc.fillRect(px-2,py-1,2,3);wc.fillRect(px+1,py-2,2,4);wc.fillStyle='#a5b5bd55';wc.fillRect(px,py+1,2,1);}
  else if(t===3||t===6){wc.strokeStyle='#d7dce066';wc.lineWidth=.9;wc.beginPath();wc.moveTo(px-2,py+1);wc.lineTo(px,py-2);wc.lineTo(px+2,py+1);wc.stroke();}
  else if(t===4){wc.fillStyle='#d7dce044';wc.fillRect(px-2,py,4,1);}
  else if(t===5){wc.fillStyle='#e7ddff88';wc.fillRect(px-1,py-2,2,2);}
 }
 terrainSeed=state.seed;paintedRevision=revision;miniRevision=-1;
}
function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function drawFortRange(x,y,preview){
 const t=TILE,r=4;
 ctx.save();ctx.fillStyle=preview?'rgba(255,210,71,.23)':'rgba(255,211,95,.18)';
 ctx.strokeStyle=preview?'#ffe3a6':'#eec05e';ctx.lineWidth=Math.max(2/Math.max(.5,zoom),1);
 ctx.beginPath();ctx.moveTo((x+.5)*t,(y-r)*t);ctx.lineTo((x+r+1)*t,(y+.5)*t);
 ctx.lineTo((x+.5)*t,(y+r+1)*t);ctx.lineTo((x-r)*t,(y+.5)*t);ctx.closePath();
 ctx.fill();ctx.stroke();ctx.restore();
}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
function draw(){if(!state?.tiles.length)return;repaintWorld();resize();const dpr=canvas.width/Math.max(1,canvas.clientWidth);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#080a0e';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(camX,camY);ctx.scale(zoom,zoom);ctx.imageSmoothingEnabled=true;ctx.drawImage(worldLayer,0,0,worldLayer.width,worldLayer.height,0,0,E.W*TILE,E.H*TILE);
 // Draw vector borders only when zoomed in sufficiently; avoid per-tile work otherwise.
 if(zoom>=0.28){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  ctx.lineWidth=Math.max(.55,1.65/zoom);ctx.strokeStyle='#e6f3ffb0';ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  const o=state.owners;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=y*E.W+x,id=o[i];if(!id)continue;
   if(x===0||o[i-1]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo(x*TILE,(y+1)*TILE);}
   if(y===0||o[i-E.W]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo((x+1)*TILE,y*TILE);}if(x===E.W-1||o[i+1]!==id){ctx.moveTo((x+1)*TILE,y*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}if(y===E.H-1||o[i+E.W]!==id){ctx.moveTo(x*TILE,(y+1)*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
  }
  ctx.stroke();
  // Thin coast outline separates land and sea without heavy biome gridlines.
  ctx.beginPath();ctx.strokeStyle='#7b849355';ctx.lineWidth=Math.max(.55,1.2/zoom);
  const tiles=state.tiles;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=y*E.W+x;if(!tiles[i])continue;
   if(x===0||!tiles[i-1]){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo(x*TILE,(y+1)*TILE);}
   if(x===E.W-1||!tiles[i+1]){ctx.moveTo((x+1)*TILE,y*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
   if(y===0||!tiles[i-E.W]){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo((x+1)*TILE,y*TILE);}
   if(y===E.H-1||!tiles[i+E.W]){ctx.moveTo(x*TILE,(y+1)*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
  }
  ctx.stroke();
 }
 // One-cell geometric landmarks; catalogue and map use identical silhouettes.
 ctx.textAlign='center';ctx.textBaseline='middle';
 const capitalLabels=[];
 for(const b of [...state.buildings].sort((a,b)=>a.y-b.y)){
  const x=(b.x+.5)*TILE,y=(b.y+.5)*TILE;
  if(x*zoom+camX<-55||x*zoom+camX>w+55||y*zoom+camY<-55||y*zoom+camY>h+55)continue;
  const ownerColor=color(b.owner);
  const spriteH=TILE*.95,footY=y+TILE*.41;
  ctx.save();ctx.translate(x-spriteH/2,y-spriteH/2);const iconUnit=b.kind==='capital'?64:512;ctx.scale(spriteH/iconUnit,spriteH/iconUnit);
  ctx.fillStyle=BUILDING_PALETTE[b.kind]||'#f1f5fa';ctx.fill(buildingPaths[b.kind]||buildingPaths.city,'evenodd');
  // Licensed silhouettes keep thin white outlines proportional to zoom.
  const licensedIcon=b.kind!=='capital';
  ctx.strokeStyle=licensedIcon?'#ffffff':'#080a0e';ctx.lineWidth=licensedIcon?12:3;ctx.stroke(buildingPaths[b.kind]||buildingPaths.city);ctx.restore();
  if(b.kind==='capital'&&zoom>.39){
   capitalLabels.push({b,x,footY,spriteH,ownerColor});
  }
 }
 // Labels are drawn after all buildings, below their bases, with collision culling.
 const labelBoxes=[];
 for(const {b,x,footY,spriteH,ownerColor} of capitalLabels){
   const p=E.person(state,b.owner),label=(p?.id||'?')+' · '+(p?.name||'').slice(0,20);
   ctx.font='750 '+Math.max(9,11/zoom)+'px system-ui';
   const tw=ctx.measureText(label).width+20/zoom,lh=20/zoom,ly=footY-spriteH-15/zoom;
   const box={x:x-tw/2,y:ly-lh/2,w:tw,h:lh};
   if(labelBoxes.some(r=>box.x<r.x+r.w&&box.x+box.w>r.x&&box.y<r.y+r.h&&box.y+box.h>r.y))continue;
   labelBoxes.push(box);
   ctx.fillStyle='#101218f2';ctx.strokeStyle=ownerColor;ctx.lineWidth=1.2/Math.max(.5,zoom);
   ctx.beginPath();ctx.roundRect(x-tw/2,ly-lh/2,tw,lh,8/Math.max(.5,zoom));ctx.fill();ctx.stroke();
   ctx.fillStyle='#f1f5fa';ctx.fillText(label,x,ly);
 }
 drawAttackPlanning();
 // Front cells come from the authoritative conquest wave, including online snapshots.
 for(const a of state.armies){
  if(a.strength<=0)continue;
  const cells=Array.isArray(a.frontCells)?a.frontCells:E.previewFront(state,a.owner,a.tx,a.ty).cells;
  ctx.fillStyle=hexAlpha(color(a.owner),.85);ctx.strokeStyle='#eef2f8';ctx.lineWidth=1/zoom;
  for(const i of cells){
   if(i<0||i>=E.W*E.H||state.owners[i]===a.owner)continue;
   const x=(i%E.W)*TILE,y=Math.floor(i/E.W)*TILE;
   if(x*zoom+camX<-TILE*zoom||x*zoom+camX>w||y*zoom+camY<-TILE*zoom||y*zoom+camY>h)continue;
   ctx.fillRect(x,y,TILE,TILE);
   if(selected?.kind==='army'&&selected.id===a.id)ctx.strokeRect(x,y,TILE,TILE);
  }
 }

 if(selected?.kind==='building'){const b=selected.kind==='building'?state.buildings.find(v=>v.id===selected.id):state.armies.find(v=>v.id===selected.id);if(b){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(b.x*TILE-5,b.y*TILE-5,TILE+10,TILE+10);ctx.setLineDash([]);}}
 if(buildMode){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  const p=mine(),price=E.KINDS[buildMode]?.cost||{},affordable=Object.entries(price).every(([k,v])=>(p?.res[k]||0)>=v);
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
  if(b?.kind==='fort')drawFortRange(b.x,b.y,false);
 }
 if(moveCursor){ctx.strokeStyle='#2c3139';ctx.lineWidth=1.5/Math.max(.5,zoom);ctx.strokeRect(moveCursor.x*TILE,moveCursor.y*TILE,TILE,TILE);}
 ctx.restore();drawMini();if(movementStart&&performance.now()-movementStart<280)queueDraw();}
function drawMini(){
 if(!state?.owners?.length||!worldLayer)return;
 const revision=state.territoryRevision??state.tick;
 if(miniRevision!==revision){
  if(!minimapCached){minimapCached=document.createElement('canvas');minimapCached.width=E.W;minimapCached.height=E.H;}
  const mc=minimapCached.getContext('2d',{alpha:false});mc.imageSmoothingEnabled=true;mc.drawImage(worldLayer,0,0,E.W,E.H);
  miniRevision=revision;
 }
 mctx.clearRect(0,0,E.W,E.H);mctx.drawImage(minimapCached,0,0);
 for(const a of state.armies){mctx.fillStyle=color(a.owner);for(const i of a.frontCells||[]){if(i>=0&&i<E.W*E.H&&state.owners[i]!==a.owner)mctx.fillRect(i%E.W,Math.floor(i/E.W),1,1);}}

 mctx.lineWidth=.65;mctx.strokeStyle='#ffffff';const scale=zoom*TILE;
 mctx.strokeRect(-camX/scale,-camY/scale,canvas.clientWidth/scale,canvas.clientHeight/scale);
}
window.addEventListener('resize',()=>{resize();clampCamera();queueDraw();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){setThreatList(false);hideAux();setPreview(null);redirectArmy=null;if(panelOpen)closePanel();else cancelMode();$('tutorial').classList.add('hidden');return;}if(panelOpen&&window.innerWidth<851&&e.key==='Tab'){const items=[...$('sidebar').querySelectorAll('button:not([disabled]), select:not([disabled])')].filter(el=>el.offsetParent!==null);if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 if(!state||state.phase!=='playing'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoomAt(1.2,canvas.clientWidth/2,canvas.clientHeight/2);if(e.key==='-')zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);if(document.activeElement===canvas){if(!moveCursor)moveCursor=mine()?.capital?{...mine().capital}:{x:80,y:52};if(e.key.startsWith('Arrow')){e.preventDefault();const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];moveCursor.x=Math.max(0,Math.min(E.W-1,moveCursor.x+d[0]));moveCursor.y=Math.max(0,Math.min(E.H-1,moveCursor.y+d[1]));camX=canvas.clientWidth/2-(moveCursor.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(moveCursor.y+.5)*TILE*zoom;clampCamera();inspectCell(moveCursor.x,moveCursor.y);$('keyboardPosition').textContent=$('mapStatus').textContent;queueDraw();}if(e.key==='Enter'){e.preventDefault();const x=moveCursor.x,y=moveCursor.y;const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);}}});
function goHome(){
 if(attackPlanner)resetAttackPlanner();
 if(demo&&state?.phase==='playing')saveSolo();
 clearTimeout(connectTimer);clearTimeout(reconnectTimer);clearTimeout(toastTimeout);
 const closingPeer=peer,closingConnections=[...connections.keys()];
 state=null;peer=null;upstream=null;host=false;demo=false;code='';myId=null;phaseShown='';
 connections.clear();previousOwners.clear();previousRevs.clear();lastSendTime.clear();pendingOrders.clear();tokenStore.clear();
 defeatDismissed=false;selected=null;buildMode=null;target=null;redirectArmy=null;pauseSolo=false;quickBuildOpen=false;hudNotice=null;lastSaveTick=-1;
 worldLayer=null;pixelLayer=null;paintedRevision=-1;activeThreats=[];
 setTimeout(()=>{for(const c of closingConnections){try{c.close();}catch(_){}}try{closingPeer?.destroy();}catch(_){}},150);
 hideAux();closePanel();$('quickBuild').classList.add('hidden');$('placingBuild').classList.add('hidden');$('targetPreview').classList.add('hidden');$('tutorial').classList.add('hidden');$('victory').classList.add('hidden');$('battleDock').classList.add('collapsed');
 $('lobbyError').textContent='';$('gameToast').classList.add('hidden');setBusy(false);
 history.replaceState(null,'',location.pathname+location.search);show('lobby');
}
function openSession(){
 $('sessionPause').classList.toggle('hidden',!demo);
 $('sessionPause').textContent=pauseSolo?'Resume game':'Pause';
 $('sessionReconnect').classList.toggle('hidden',host||demo||!state||!/RECONNECT|OFFLINE|DELAY|SYNC/.test($('networkStatus').textContent));
 $('sessionHint').textContent=demo?'Paused. Your progress is saved when you leave.':host?'Host: leaving ends the match for everyone.':'Rejoin later on this device using the room code.';
 showAux('sessionPanel');
 if(demo&&!$('sessionPanel').classList.contains('hidden')&&!pauseSolo){pauseSolo=true;menuPausedSolo=true;saveSolo();}
 $('sessionPause').textContent=pauseSolo?'Resume game':'Pause';
}
function requestExit(){
 if(!state||state.phase==='ended'||demo&&mine()?.eliminated)return goHome();
 if(demo&&saveSolo())return goHome();
 $('exitExplanation').textContent=demo?'Failed to save the match on this device. Leave without saving?':host?'You are the host. The match will end for everyone. Host transfer is unavailable.':'Your army will remain in the match. Rejoin on this device using the room code.';
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
$('hudFronts').onclick=()=>$('armiesToggle').click();$('hudFronts').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('armiesToggle').click();}};
function openResearch(){openPanel();updateUI();}
$('scienceButton').onclick=openResearch;
$('closeSession').onclick=hideAux;$('openLeaderboard').onclick=()=>showAux('quickLeadersPanel');$('closeQuickLeaders').onclick=hideAux;
$('sessionPause').onclick=()=>{menuPausedSolo=false;pauseSolo=false;hideAux();};
$('sessionReconnect').onclick=()=>{reconnectTries=0;retryUpstream();toast('Trying to reconnect');};
$('exitMatch').onclick=requestExit;$('cancelExit').onclick=openSession;
$('confirmExit').onclick=()=>{if(host&&!demo)for(const c of connections.keys())try{c.send({t:'room-closed'});}catch(_){}goHome();};
$('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();joinRoom();}});
$('nickname').addEventListener('change',()=>name());
$('soloBots').addEventListener('change',()=>{try{localStorage.setItem('bk-solo-bots',$('soloBots').value);}catch(_){}});
$('readyButton').onclick=()=>{readyLocal=!readyLocal;$('readyButton').setAttribute('aria-pressed',String(readyLocal));upstream?.send({t:'ready',value:readyLocal});};
for(const id of ['botCount'])$(id).onchange=()=>{if(host&&state?.phase==='lobby'){state.settings={bots:Number($('botCount').value)};broadcast();}};
$('spawnChoice').onchange=()=>{if(state?.phase!=='lobby')return;if(host){mine().spawnPreference=$('spawnChoice').value;broadcast();}else upstream?.send({t:'spawn',choice:$('spawnChoice').value});};
$('resultExit').onclick=requestExit;$('spectateMatch').onclick=()=>{defeatDismissed=true;phaseShown='playing';$('victory').classList.add('hidden');};
$('restart').onclick=()=>{
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
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveSolo();});
setInterval(()=>{if(demo&&state?.phase==='playing'&&!pauseSolo&&state.tick%10===0&&lastSaveTick!==state.tick){lastSaveTick=state.tick;saveSolo();}if(!host||!state||state.phase!=='playing'||pauseSolo)return;E.tick(state);broadcast();},1000);
setInterval(()=>{if(host&&state?.phase==='playing'&&!pauseSolo&&state.armies.length){E.combatStep(state);broadcast();}},333);
setInterval(()=>{if(!demo&&!host&&state?.phase==='playing'&&Date.now()-lastStateAt>4500){setNetwork('CONNECTION DELAYED');}for(const [id,at] of pendingOrders)if(Date.now()-at>7000){pendingOrders.delete(id);toast('Order not confirmed. Check connection.');}},2000);
})();
