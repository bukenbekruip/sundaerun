/**
 * Material transfer is confined to authored body-panel masks. Window glass,
 * lamps, wheel assemblies, vents, badges and carbon trim are excluded before
 * any colour operation. Near-neutral and warm reflected light is retained.
 * These are illustrated finishes, not manufacturer paint/fitment simulations.
 */
const ART_WIDTH = 1672;
const ART_HEIGHT = 941;
const maskCache = new Map();
const clamp = (value, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));
const smooth = (low, high, value) => {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

// Master-space Bezier boundaries follow the visible STI painted shell. Holes
// follow glazing and complete non-painted assemblies rather than pixel colours.
const STI = {
  panels: [
    "M74 495 C77 450 92 406 117 375 C173 353 198 331 236 291 C292 237 345 193 423 176 C483 169 553 171 604 178 C734 171 906 183 1043 222 C1119 256 1184 312 1267 362 C1293 360 1323 370 1343 386 C1458 396 1516 418 1568 470 L1605 553 Q1632 586 1639 621 L1654 740 L1612 751 L1560 755 L1005 758 L930 713 L908 666 L665 721 L276 687 L230 641 L74 598 L59 525 Z",
    "M86 234 L143 236 Q153 239 156 248 L158 289 Q147 301 125 294 L91 284 Z",
    "M151 243 L316 242 L304 258 L159 268 Z",
  ],
  holes: [
    // Side glazing, windscreen and mirror assembly.
    "M268 302 C317 256 357 225 423 214 L480 210 L447 363 L270 349 Z",
    "M495 210 C549 209 594 212 619 229 L706 359 L704 383 L461 365 Z",
    "M679 233 C773 214 883 223 1004 243 L1231 354 L786 353 L769 340 Z",
    "M624 188 C744 180 905 194 1003 227 L978 235 C870 213 754 211 654 226 Z",
    "M519 326 C548 318 598 318 622 336 L637 372 L649 407 L629 431 L603 417 L596 384 L525 379 Z",
    // Rear/front tyres and rims; the full wheel unit never receives paint.
    "M103 551 C103 501 134 477 173 477 C216 477 241 530 248 590 C252 653 231 706 190 721 C142 734 104 691 98 627 C95 601 99 575 103 551 Z",
    "M694 613 C696 554 719 511 756 497 C797 485 843 501 870 539 C899 576 911 632 904 688 C895 753 869 793 825 803 C772 814 724 789 701 733 C683 685 684 648 694 613 Z",
    // Hood opening and fender vents.
    "M1188 394 Q1248 385 1350 393 L1375 399 L1382 406 L1285 416 L1205 411 Z",
    "M754 387 L810 386 L798 412 L737 417 Z",
    "M708 439 L751 427 L728 490 L692 503 Z",
    "M686 544 L698 545 L674 690 L646 713 L640 714 L660 645 Z",
    // Lamps, radiator grille, lower intakes and carbon aero.
    "M120 383 L145 379 L139 402 L111 425 L109 415 Z",
    "M947 470 C970 463 1008 469 1107 492 L1159 508 L1175 530 L1153 540 L1046 536 L995 526 L970 509 Z",
    "M1554 465 L1585 474 Q1600 499 1593 534 L1570 547 L1552 530 Z",
    "M1270 514 L1535 511 L1525 579 L1300 583 L1271 569 L1259 532 Z",
    "M1251 627 L1568 624 L1585 713 L1226 726 L1214 712 Z",
    "M1054 619 L1168 620 L1137 711 L1027 713 L1039 670 Z",
    "M938 595 L948 608 L974 638 L966 640 L950 625 Z",
    "M900 724 L965 758 L1551 766 L1644 738 L1672 772 L1601 798 L951 797 L899 773 Z",
    "M67 489 L104 501 L97 580 L91 595 L113 627 L98 653 L39 624 L48 588 L73 574 Z",
    "M249 658 L306 684 L648 716 L634 735 L287 697 L251 680 Z",
  ],
};

const PORSCHE = {
  panels: [
    "M58 468 C75 424 105 382 141 360 L266 332 C353 263 443 220 548 211 C660 195 798 203 901 227 C1019 262 1104 334 1176 386 C1338 385 1455 395 1517 432 C1582 484 1615 552 1628 597 L1631 740 L1600 756 L1081 764 L1004 742 L975 676 L735 718 L697 716 L284 678 L269 561 L96 537 L58 494 Z",
    "M132 250 L444 245 L429 270 L270 280 L142 291 Z",
  ],
  holes: [
    "M322 336 C354 303 415 267 478 252 C523 239 562 236 597 242 C632 250 650 276 673 316 L711 383 L463 372 L339 355 Q322 351 322 336 Z",
    "M684 241 C747 225 843 229 913 250 C1010 288 1099 346 1166 381 L755 386 C740 355 721 310 699 276 Z",
    "M653 214 C730 202 830 211 908 232 L904 237 C827 221 748 223 680 238 Z",
    "M545 353 C562 338 604 336 633 348 L657 363 L661 387 L645 395 L667 412 L650 421 L624 414 L615 395 L563 393 Q540 387 545 353 Z",
    "M99 527 C104 466 132 431 178 428 C229 427 265 476 278 546 C289 604 285 657 255 697 C222 729 156 723 119 688 C84 654 84 585 99 527 Z",
    "M747 567 C764 496 802 476 850 476 C899 472 941 506 966 554 C996 611 1006 686 979 746 C953 795 916 812 858 808 C802 808 759 781 743 732 C723 680 727 621 747 567 Z",
    "M296 397 C313 389 329 398 336 413 L354 487 L349 500 L321 493 L307 455 Z",
    "M820 431 L842 409 L924 410 L902 440 L837 444 Z",
    "M1136 426 L1190 430 L1268 461 L1257 466 L1188 448 L1145 440 Z",
    "M1306 425 L1355 427 L1408 462 L1395 466 L1342 441 Z",
    "M1025 426 C1058 410 1097 431 1123 455 C1152 485 1175 517 1181 538 C1158 552 1115 547 1081 526 C1045 506 1023 465 1025 426 Z",
    "M1458 421 C1486 421 1517 449 1535 477 L1561 526 L1551 536 C1522 516 1496 484 1476 455 Z",
    "M719 542 L738 539 L722 668 L701 664 Z",
    "M992 577 L1014 582 L1077 716 L1051 714 L1013 681 L995 650 Z",
    "M1173 648 L1292 649 L1254 732 L1155 740 L1145 734 Z",
    "M1182 623 L1288 625 L1299 638 L1175 639 Z",
    "M1386 656 L1544 655 L1544 741 L1369 742 Z",
    "M1573 659 L1581 658 L1587 730 L1571 735 Z",
    "M1603 618 L1618 620 L1618 674 L1606 677 Z",
    "M284 650 L314 662 L698 702 L720 698 L724 725 L296 684 L283 669 Z",
    "M992 738 L1083 761 L1575 758 L1625 738 L1651 759 L1617 778 L1081 795 L990 770 Z",
    "M60 487 L86 499 L77 579 L86 598 L105 624 L83 631 L39 613 L38 603 L66 587 Z",
    "M1299 528 L1332 532 L1350 548 L1323 545 Z",
    "M1480 533 L1505 528 L1515 550 L1498 548 Z",
    "M1403 521 L1424 526 L1429 540 L1416 547 L1404 535 Z",
  ],
};

const GT86 = {
  panels: [
    "M76 483 C69 446 77 404 93 383 L158 365 C205 348 245 308 306 271 C373 232 445 213 515 205 L526 192 L545 192 L562 204 C663 199 812 202 914 224 C1016 249 1118 319 1219 396 C1380 402 1500 437 1566 484 L1597 510 Q1611 541 1618 572 L1635 648 L1651 744 L1658 774 L1592 783 L1021 782 L967 747 L967 705 L706 751 L269 705 L241 664 L66 630 L40 617 L55 577 Z",
    "M77 296 L124 297 L140 309 L139 338 L123 344 L81 333 Z",
    "M127 295 L323 291 L318 304 L137 315 Z",
    "M906 229 C1010 252 1109 321 1219 391 L1231 405 L1213 399 C1103 329 981 270 906 239 Z",
  ],
  holes: [
    "M294 326 C347 274 409 244 477 239 C531 236 574 236 596 248 L665 394 L621 396 L604 383 L358 383 Q307 369 294 326 Z",
    "M645 249 C740 234 857 242 934 265 L1156 378 L719 388 Z",
    "M498 348 C524 333 564 334 591 347 L607 373 L608 397 L622 419 L615 441 L594 439 L576 411 L513 401 Q496 385 498 348 Z",
    "M88 564 C91 512 116 475 153 469 C187 462 216 480 235 517 C256 556 263 609 253 658 C245 704 219 732 186 740 C150 744 120 718 103 679 C86 642 81 602 88 564 Z",
    "M724 608 C736 552 768 515 806 506 C850 496 894 515 922 554 C953 598 971 661 963 720 C957 776 929 815 887 827 C835 841 784 820 754 772 C726 726 712 662 724 608 Z",
    "M697 429 L749 432 L797 444 L777 460 L725 463 L700 451 Z",
    "M987 491 L1016 495 L1172 531 L1228 553 L1254 575 L1210 580 L1108 578 L1036 566 L1010 548 L992 520 Z",
    "M1562 496 L1588 508 L1601 541 L1597 566 L1573 575 L1560 550 Z",
    "M1429 548 Q1455 541 1478 555 L1485 574 L1464 588 L1441 583 L1425 566 Z",
    "M1041 646 L1114 662 L1124 669 L1110 695 L1088 722 L1061 727 L1045 697 Z",
    "M1231 642 L1553 644 L1581 665 L1590 728 L1563 744 L1187 747 L1210 688 Z",
    "M1617 620 L1628 628 L1630 674 L1623 710 L1615 711 L1609 660 Z",
    "M253 648 L280 669 L287 693 L664 733 L679 711 L702 720 L704 750 L665 758 L273 710 L251 684 Z",
    "M967 752 L1019 782 L1596 782 L1657 765 L1672 799 L1623 813 L1024 814 L975 793 Z",
    "M58 491 L85 498 L79 561 L90 598 L97 621 L87 651 L31 629 L43 592 L57 578 Z",
    "M682 653 L708 658 L706 716 L688 746 L665 734 Z",
  ],
};

const M3 = {
  panels: [
    "M42 477 L70 341 L176 321 C266 260 350 191 466 166 C627 148 814 169 978 230 L1217 399 C1405 416 1540 458 1590 507 L1626 580 L1646 762 L1653 804 L1541 819 L990 815 L957 748 L738 760 L256 708 L230 680 L45 677 Z",
    "M1185 332 Q1222 317 1246 341 L1254 367 L1224 376 L1200 362 Z",
  ],
  holes: [
    "M247 301 C310 248 382 213 449 203 L409 353 L245 343 Z",
    "M467 205 C534 207 585 220 625 251 L660 331 L659 345 L649 344 Q630 314 592 318 L559 334 L555 367 L427 353 Z",
    "M659 196 C771 185 923 215 999 258 L1219 375 L760 374 Z",
    "M107 535 C119 499 138 477 160 475 C191 470 217 496 232 535 C247 579 250 624 239 670 C227 704 205 722 180 721 C152 718 128 700 113 667 C99 631 96 581 107 535 Z",
    "M750 614 C756 562 784 521 823 511 C870 497 915 523 943 568 C971 615 982 676 970 731 C959 780 933 811 896 821 C850 833 805 813 778 778 C749 738 740 673 750 614 Z",
    "M708 466 Q710 455 725 456 L776 461 Q784 465 781 476 L775 488 L714 493 Z",
    "M707 548 L733 552 L732 561 L706 558 Z",
    "M80 377 L94 373 L96 414 L84 437 L73 435 Z",
    "M1025 519 Q1045 505 1082 508 L1194 513 Q1234 513 1249 539 L1263 568 L1230 578 L1214 569 L1056 569 Q1017 571 1017 554 Z",
    "M1520 515 Q1562 499 1586 510 L1602 563 L1583 573 L1525 568 Z",
    "M1301 516 Q1350 499 1409 514 L1416 577 Q1412 595 1375 597 L1343 590 Q1312 576 1301 534 Z",
    "M1431 513 Q1470 502 1506 514 L1511 574 Q1496 591 1451 595 L1428 588 Z",
    "M1378 480 Q1393 472 1408 480 L1412 488 Q1398 499 1382 490 Z",
    "M1096 681 Q1100 669 1118 668 L1199 669 Q1207 683 1216 711 L1207 730 L1095 729 Z",
    "M1585 676 L1613 665 L1616 708 L1582 720 Z",
    "M1282 681 L1540 680 L1522 715 L1506 735 Q1490 742 1465 745 L1306 748 Q1290 743 1282 718 Z",
    "M987 789 L1184 791 L1529 781 L1635 764 L1645 783 L1611 801 L1264 811 L986 803 Z",
  ],
};
const GOLF = {
  panels: [
    "M47 488 C58 415 101 286 175 219 C247 163 376 135 489 137 C655 132 823 153 951 204 L1185 372 C1384 387 1503 427 1567 480 L1608 547 L1631 668 L1647 791 L1598 805 L960 810 L921 747 L721 759 L252 712 L227 675 L49 650 Z",
  ],
  holes: [
    "M227 296 C273 222 355 190 450 180 L419 345 L219 332 Z",
    "M476 181 C538 180 585 194 622 228 L679 346 L660 346 L642 329 Q605 308 564 320 L548 337 L550 365 L450 350 Z",
    "M670 181 C774 176 912 193 989 235 L1240 366 L792 367 L762 352 L732 295 Z",
    "M590 148 C751 136 931 158 1021 193 L1006 205 L765 175 L624 170 Z",
    "M549 338 Q578 310 623 321 L656 344 L669 370 L646 385 L588 377 L550 359 Z",
    "M91 546 C99 505 118 480 150 474 C185 467 215 491 232 531 C253 576 256 628 242 673 C230 712 206 733 178 732 C145 728 118 705 103 668 C90 632 85 586 91 546 Z",
    "M731 617 C740 567 772 529 808 520 C850 511 892 534 917 576 C944 619 955 672 946 721 C938 770 916 807 880 819 C836 834 793 815 769 780 C741 741 725 678 731 617 Z",
    "M91 351 L111 351 L119 407 L102 430 L80 428 Z",
    "M700 475 L734 479 L729 485 L699 483 Z",
    "M968 488 Q983 478 1010 486 L1183 530 L1235 557 L1239 569 L1216 573 L1011 543 L978 528 Z",
    "M1543 480 L1558 485 Q1589 509 1590 550 L1586 563 L1550 568 Z",
    "M1234 525 L1549 525 L1557 569 L1239 575 Z",
    "M1377 542 C1377 523 1389 510 1405 510 C1423 510 1436 526 1436 546 C1436 567 1424 580 1408 580 C1390 579 1377 564 1377 542 Z",
    "M1004 655 Q1008 641 1031 643 L1066 649 L1070 727 L1101 739 L1102 752 L1023 749 L1005 734 Z",
    "M1058 666 L1186 681 L1188 685 L1058 676 Z",
    "M1068 699 L1200 715 L1202 719 L1068 710 Z",
    "M1075 730 L1220 744 L1219 748 L1075 740 Z",
    "M1206 655 L1588 647 Q1609 667 1596 704 L1580 733 L1236 737 Z",
    "M940 788 L1280 791 L1621 768 L1640 785 L1588 803 L940 806 Z",
  ],
};
const RS3 = {
  panels: [
    "M27 480 C48 416 96 292 174 223 C257 164 375 138 489 137 C657 130 833 151 978 211 L1226 380 C1425 393 1554 431 1603 485 L1638 551 L1659 698 L1661 795 L1556 808 L988 811 L945 745 L738 755 L247 707 L223 669 L27 639 Z",
  ],
  holes: [
    "M209 305 C267 228 348 194 442 181 L409 337 L207 326 Z",
    "M482 194 C541 191 589 207 621 237 L678 343 L664 346 L643 331 Q610 313 574 326 L557 343 L560 358 L452 343 Z",
    "M704 211 C792 204 919 223 999 250 L1205 358 L802 357 L766 326 Z",
    "M588 147 C749 134 932 159 1022 196 L1008 207 L766 177 L625 171 Z",
    "M552 339 Q581 313 622 323 L655 346 L668 373 L646 388 L588 377 L552 360 Z",
    "M66 547 C73 497 96 468 129 459 C169 451 201 478 224 524 C234 566 235 621 224 668 C211 709 195 734 176 737 C136 738 101 710 81 672 C59 633 55 590 66 547 Z",
    "M739 611 C749 556 778 520 820 508 C863 498 905 518 934 559 C961 604 974 661 965 718 C956 772 932 811 890 824 C848 837 804 817 777 778 C746 734 733 671 739 611 Z",
    "M64 348 L91 344 L99 369 L91 392 L60 398 Z",
    "M974 480 C1009 473 1085 486 1128 505 L1271 511 L1239 549 L1207 575 L1110 571 L1022 548 L992 525 Z",
    "M1564 487 L1588 498 Q1603 518 1600 542 L1586 555 L1565 558 L1543 531 Z",
    "M1300 529 L1537 526 L1592 579 L1591 686 L1541 731 L1302 734 L1261 612 L1272 571 Z",
    "M1050 626 L1151 642 L1208 730 L1081 737 L1034 705 L1040 667 Z",
    "M1624 623 L1643 605 L1647 710 L1610 736 Z",
    "M246 681 L289 691 L731 742 L730 754 L288 705 L243 691 Z",
    "M958 768 L1034 784 L1604 770 L1658 748 L1672 803 L1605 822 L978 824 Z",
  ],
};
const authoredMasks = {
  sti: STI,
  porsche: PORSCHE,
  gt86: GT86,
  m3: M3,
  golf: GOLF,
  rs3: RS3,
};

function canvas(width, height) {
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  return output;
}

function maskFor(vehicleId, width, height) {
  const key = `${vehicleId}:${width}:${height}`;
  if (!maskCache.has(key)) {
    const artwork = authoredMasks[vehicleId];
    if (!artwork)
      throw new RangeError(
        `Paint panels have not been authored for vehicle: ${vehicleId}`,
      );
    const output = canvas(width, height);
    const context = output.getContext("2d", { willReadFrequently: true });
    context.scale(width / ART_WIDTH, height / ART_HEIGHT);
    context.fillStyle = "#fff";
    for (const path of artwork.panels) context.fill(new Path2D(path));
    context.globalCompositeOperation = "destination-out";
    for (const path of artwork.holes) context.fill(new Path2D(path));
    maskCache.set(key, context.getImageData(0, 0, width, height).data);
  }
  return maskCache.get(key);
}

/** Diagnostic copy: white painted panels, transparent excluded assemblies. */
export function createPaintMask(
  vehicleId,
  width = ART_WIDTH,
  height = ART_HEIGHT,
) {
  const output = canvas(width, height);
  const context = output.getContext("2d");
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray(maskFor(vehicleId, width, height)),
      width,
      height,
    ),
    0,
    0,
  );
  return output;
}

/** Independent interior probes for wheels, glass, lamps, grille and carbon trim. */
export const protectedPaintSamples = Object.freeze({
  rs3: Object.freeze([
    { name: "rear-wheel", x: 149, y: 598 },
    { name: "front-wheel", x: 850, y: 668 },
    { name: "side-glass", x: 510, y: 280 },
    { name: "windscreen", x: 920, y: 290 },
    { name: "mirror", x: 599, y: 350 },
    { name: "headlight", x: 1115, y: 530 },
    { name: "grille-badge", x: 1440, y: 567 },
    { name: "lower-intake", x: 1105, y: 685 },
  ]),
  m3: Object.freeze([
    { name: "rear-wheel", x: 165, y: 600 },
    { name: "front-wheel", x: 850, y: 660 },
    { name: "side-glass", x: 515, y: 285 },
    { name: "windscreen", x: 925, y: 290 },
    { name: "headlight", x: 1130, y: 546 },
    { name: "grille", x: 1400, y: 570 },
    { name: "foglamp", x: 1135, y: 693 },
    { name: "lower-intake", x: 1400, y: 704 },
  ]),
  golf: Object.freeze([
    { name: "rear-wheel", x: 155, y: 600 },
    { name: "front-wheel", x: 823, y: 680 },
    { name: "side-glass", x: 500, y: 280 },
    { name: "windscreen", x: 900, y: 290 },
    { name: "mirror", x: 596, y: 348 },
    { name: "headlight", x: 1080, y: 530 },
    { name: "grille-badge", x: 1390, y: 555 },
    { name: "lower-intake", x: 1400, y: 700 },
  ]),
  sti: Object.freeze([
    { name: "rear-wheel", x: 180, y: 590 },
    { name: "front-wheel", x: 800, y: 645 },
    { name: "rear-glass", x: 365, y: 290 },
    { name: "side-glass", x: 565, y: 280 },
    { name: "windscreen", x: 925, y: 280 },
    { name: "mirror", x: 570, y: 350 },
    { name: "headlight", x: 1040, y: 512 },
    { name: "grille-badge", x: 1410, y: 541 },
    { name: "hood-scoop", x: 1280, y: 400 },
    { name: "lower-intake", x: 1410, y: 681 },
  ]),
  porsche: Object.freeze([
    { name: "rear-wheel", x: 180, y: 580 },
    { name: "front-wheel", x: 855, y: 640 },
    { name: "side-glass", x: 550, y: 300 },
    { name: "windscreen", x: 900, y: 300 },
    { name: "mirror", x: 590, y: 366 },
    { name: "headlight", x: 1100, y: 480 },
    { name: "fender-vent", x: 870, y: 420 },
    { name: "grille", x: 1450, y: 690 },
    { name: "carbon-fin", x: 1008, y: 654 },
    { name: "badge", x: 1416, y: 533 },
  ]),
  gt86: Object.freeze([
    { name: "rear-wheel", x: 176, y: 596 },
    { name: "front-wheel", x: 852, y: 667 },
    { name: "rear-glass", x: 349, y: 331 },
    { name: "side-glass", x: 454, y: 301 },
    { name: "windscreen", x: 948, y: 302 },
    { name: "mirror", x: 549, y: 370 },
    { name: "headlight", x: 1120, y: 546 },
    { name: "far-headlight", x: 1583, y: 543 },
    { name: "badge", x: 1454, y: 566 },
    { name: "grille", x: 1410, y: 697 },
    { name: "foglamp", x: 1073, y: 666 },
    { name: "fender-vent", x: 750, y: 448 },
    { name: "carbon-skirt", x: 471, y: 728 },
    { name: "splitter", x: 1377, y: 790 },
  ]),
});

function rgbToHsl(red, green, blue) {
  const maximum = Math.max(red, green, blue),
    minimum = Math.min(red, green, blue);
  const delta = maximum - minimum,
    lightness = (maximum + minimum) / 2;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    maximum === red
      ? ((green - blue) / delta) % 6
      : maximum === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return [hue, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  const values =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return values.map((value) => Math.round(clamp(value + offset) * 255));
}

function paintColour(paint) {
  const match = /^#([\da-f]{6})$/i.exec(paint?.colour ?? paint?.color ?? "");
  if (!match) throw new TypeError("A paint requires a six-digit hex colour.");
  const number = Number.parseInt(match[1], 16);
  return rgbToHsl(
    (number >> 16) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  );
}

/** Render one painted body while preserving the original source alpha/geometry. */
export async function renderCar(image, vehicleId, paint) {
  if (paint?.id === "blue") return image.currentSrc || image.src;
  if (!image.complete || !image.naturalWidth) await image.decode();
  const [targetHue, targetSaturation, targetLightness] = paintColour(paint);
  const width = image.naturalWidth,
    height = image.naturalHeight;
  const output = canvas(width, height);
  const context = output.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data,
    mask = maskFor(vehicleId, width, height);
  const baseLightness = 0.43;
  const darkExponent =
    Math.log(Math.max(targetLightness, 0.035)) / Math.log(baseLightness);
  const lightExponent =
    Math.log(Math.max(1 - targetLightness, 0.035)) /
    Math.log(1 - baseLightness);
  for (let index = 0; index < data.length; index += 4) {
    if (!mask[index + 3] || !data[index + 3]) continue;
    const [hue, saturation, lightness] = rgbToHsl(
      data[index] / 255,
      data[index + 1] / 255,
      data[index + 2] / 255,
    );
    const distance = Math.abs(((hue - 222 + 540) % 360) - 180);
    // This material guard is secondary to the authored geometry. It protects
    // neutral/warm reflected highlights and dark carbon details inside panels.
    const blueMaterial =
      (1 - smooth(43, 73, distance)) * smooth(0.09, 0.3, saturation);
    const blend = (mask[index + 3] / 255) * blueMaterial;
    if (blend <= 0) continue;
    const newLightness =
      targetLightness < baseLightness
        ? Math.pow(lightness, darkExponent)
        : 1 - Math.pow(1 - lightness, lightExponent);
    const newHue = (targetHue + clamp(hue - 222, -16, 16) * 0.25 + 360) % 360;
    const newSaturation = clamp(
      targetSaturation * Math.pow(saturation / 0.78, 0.72),
    );
    const colour = hslToRgb(newHue, newSaturation, newLightness);
    for (let channel = 0; channel < 3; channel += 1)
      data[index + channel] = Math.round(
        data[index + channel] * (1 - blend) + colour[channel] * blend,
      );
  }
  context.putImageData(pixels, 0, 0);
  // The application owns its bounded LRU. Do not retain a second cross-product
  // cache of large PNG strings inside the material renderer.
  return output.toDataURL("image/png");
}

export const paintMaskVehicles = Object.freeze(Object.keys(authoredMasks));
