// pdf.js'in (legacy) kullandığı ama kendisi tamamlamadığı yeni JavaScript özellikleri: iOS 15-17.3 ve eski Android
// WebView'larında yoklar (okuyucu açılmazdı). Hem sayfada hem pdf.js işçisinde, pdf.js'ten önce yüklenir.
import 'core-js/actual/promise/with-resolvers';
import 'core-js/actual/object/has-own';
import 'core-js/actual/array/at';
import 'core-js/actual/typed-array/at';
import 'core-js/actual/string/at';
import 'core-js/actual/array/find-last';
import 'core-js/actual/array/find-last-index';
import 'core-js/actual/typed-array/find-last';
import 'core-js/actual/structured-clone';
import 'core-js/actual/iterator';
