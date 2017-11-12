###################################################################################################
#
# @purpose: Sending steadily requests to Heroku so that it doesn't switch into sleeping mode
# @author: Philipp Rieger
#
###################################################################################################


import requests
import threading


URL = "https://test-trust-wallet-backend.herokuapp.com/"


def main():
	threading.Timer(60.0 * 8, main).start()	# call main every 8 min
	print("Sending GET to {}".format(URL))
	r = requests.get(URL)
	print("Response: {}".format(r.text.encode('utf-8')))


if __name__ == "__main__":
	main()