# -*- coding: utf-8 -*-
"""
30.10.2026: Google Search Console sahiplik doğrulaması (URL ön eki mülkü https://www.idealistgyo.com/, HTML etiketi
yöntemi; etiket kullanıcıdan). Ana sayfanın <head> bölümüne eklenir. Etiket gizli değildir; kaldırılırsa doğrulama düşer.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

ETIKET = '<meta name="google-site-verification" content="ycSdaojEdiP4F1JXDD9vIWH5tIyMh-83pg80BI5iH6M">'
degistir('index.html', '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<meta name="viewport" content="width=device-width, initial-scale=1">' + ETIKET)
print('eklendi')
